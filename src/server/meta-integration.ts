import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GRAPH = "https://graph.facebook.com/v21.0";

function getMetaEnv() {
  const appId =
    process.env.META_APP_ID ||
    (import.meta as any).env?.VITE_META_APP_ID ||
    (import.meta as any).env?.META_APP_ID;
  const appSecret =
    process.env.META_APP_SECRET ||
    (import.meta as any).env?.META_APP_SECRET;
  return { appId, appSecret };
}

/** Gera URL de OAuth para iniciar a conexão com o Facebook */
export const getMetaAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { redirectUri: string }) =>
    z.object({ redirectUri: z.string().url().max(500) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { appId } = getMetaEnv();
    if (!appId) {
      return { url: null, error: "META_APP_ID não configurado. Adicione o secret no Lovable Cloud." };
    }
    const state = `${context.userId}:${crypto.randomUUID()}`;
    const scope = "ads_read,business_management";
    const url =
      `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(data.redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code`;
    return { url, error: null };
  });

/** Recebe o code do callback, troca por long-lived token e salva conexão */
export const finishMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; redirectUri: string }) =>
    z.object({
      code: z.string().min(1).max(2000),
      redirectUri: z.string().url().max(500),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { appId, appSecret } = getMetaEnv();
    if (!appId || !appSecret) {
      return { ok: false, error: "Secrets META_APP_ID/META_APP_SECRET não configurados." };
    }

    // 1) code -> short-lived token
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        `client_id=${appId}&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(data.redirectUri)}` +
        `&code=${encodeURIComponent(data.code)}`
    );
    const shortJson: any = await shortRes.json();
    if (!shortRes.ok || !shortJson.access_token) {
      return { ok: false, error: shortJson.error?.message || "Falha ao trocar code" };
    }

    // 2) short -> long-lived (~60 dias)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
        `&client_id=${appId}&client_secret=${appSecret}` +
        `&fb_exchange_token=${shortJson.access_token}`
    );
    const longJson: any = await longRes.json();
    const accessToken = longJson.access_token || shortJson.access_token;
    const expiresIn = longJson.expires_in || 60 * 24 * 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3) busca info do user Meta
    const meRes = await fetch(`${GRAPH}/me?fields=id,name&access_token=${accessToken}`);
    const me: any = await meRes.json();
    if (!me.id) return { ok: false, error: "Não consegui ler /me da Graph API" };

    // 4) upsert conexão
    const { error: upsertErr } = await context.supabase
      .from("meta_connections" as any)
      .upsert(
        {
          user_id: context.userId,
          meta_user_id: me.id,
          meta_user_name: me.name,
          access_token: accessToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,meta_user_id" }
      );
    if (upsertErr) return { ok: false, error: upsertErr.message };

    return { ok: true, error: null };
  });

/** Lista conexões do usuário e contas vinculadas */
export const listMetaConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: connections } = await context.supabase
      .from("meta_connections" as any)
      .select("id, meta_user_id, meta_user_name, expires_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const ids = (connections || []).map((c: any) => c.id);
    let accounts: any[] = [];
    if (ids.length) {
      const { data } = await context.supabase
        .from("ad_accounts" as any)
        .select("id, name, currency, status, business_name, client_id, connection_id, last_sync_at, last_sync_status, last_sync_error")
        .in("connection_id", ids);
      accounts = data || [];
    }
    return { connections: connections || [], accounts };
  });

/** Importa contas de anúncio da Graph API para o banco */
export const importAdAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) =>
    z.object({ connectionId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: conn } = await context.supabase
      .from("meta_connections" as any)
      .select("id, user_id, access_token")
      .eq("id", data.connectionId)
      .maybeSingle();

    if (!conn || (conn as any).user_id !== context.userId) {
      return { ok: false, error: "Conexão não encontrada", count: 0 };
    }

    const res = await fetch(
      `${GRAPH}/me/adaccounts?fields=account_id,name,currency,account_status,business_name&access_token=${(conn as any).access_token}&limit=200`
    );
    const json: any = await res.json();
    if (!res.ok) return { ok: false, error: json.error?.message || "Erro Graph API", count: 0 };

    const rows = (json.data || []).map((a: any) => ({
      id: `act_${a.account_id}`,
      connection_id: (conn as any).id,
      name: a.name,
      currency: a.currency,
      status: String(a.account_status ?? ""),
      business_name: a.business_name ?? null,
      last_sync_status: "never",
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error } = await context.supabase
        .from("ad_accounts" as any)
        .upsert(rows, { onConflict: "id" });
      if (error) {
        await context.supabase
          .from("ad_accounts" as any)
          .update({ last_sync_status: "error", last_sync_error: error.message, updated_at: new Date().toISOString() })
          .eq("id", data.adAccountId);
        return { ok: false, error: error.message, count: 0 };
      }
    }

    await context.supabase
      .from("ad_accounts" as any)
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success", last_sync_error: null, updated_at: new Date().toISOString() })
      .eq("id", data.adAccountId);
    return { ok: true, error: null, count: rows.length };
  });

/** Vincula uma conta de anúncio a um cliente do CRM */
export const linkAdAccountToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adAccountId: string; clientId: string | null }) =>
    z.object({
      adAccountId: z.string().min(1).max(100),
      clientId: z.string().uuid().nullable(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ad_accounts" as any)
      .update({ client_id: data.clientId, updated_at: new Date().toISOString() })
      .eq("id", data.adAccountId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

/** Sincroniza insights diários (últimos N dias) de uma conta */
export const syncInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adAccountId: string; days?: number }) =>
    z.object({
      adAccountId: z.string().min(1).max(100),
      days: z.number().int().min(1).max(90).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: acc } = await context.supabase
      .from("ad_accounts" as any)
      .select("id, client_id, connection_id, meta_connections!inner(user_id, access_token)")
      .eq("id", data.adAccountId)
      .maybeSingle();

    if (!acc) return { ok: false, error: "Conta não encontrada", count: 0 };
    if (!(acc as any).client_id) {
      return { ok: false, error: "Vincule esta conta a um cliente antes de sincronizar.", count: 0 };
    }
    const conn: any = (acc as any).meta_connections;
    if (conn.user_id !== context.userId) {
      return { ok: false, error: "Sem permissão", count: 0 };
    }

    await context.supabase
      .from("ad_accounts" as any)
      .update({ last_sync_status: "running", last_sync_error: null, updated_at: new Date().toISOString() })
      .eq("id", data.adAccountId);

    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
    const until = new Date().toISOString().slice(0, 10);

    const url =
      `${GRAPH}/${data.adAccountId}/insights?` +
      `time_increment=1` +
      `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
      `&fields=date_start,spend,impressions,reach,clicks,ctr,actions` +
      `&limit=500&access_token=${conn.access_token}`;

    const res = await fetch(url);
    const json: any = await res.json();
    if (!res.ok) {
      const error = json.error?.message || "Erro Graph API";
      await context.supabase
        .from("ad_accounts" as any)
        .update({ last_sync_status: "error", last_sync_error: error, updated_at: new Date().toISOString() })
        .eq("id", data.adAccountId);
      return { ok: false, error, count: 0 };
    }

    const rows = (json.data || []).map((d: any) => {
      const conversions = (d.actions || [])
        .filter((a: any) => /purchase|lead|complete_registration|onsite_conversion|messaging_conversation|contact|submit_application|subscribe|start_trial|add_to_cart|initiate_checkout/i.test(a.action_type))
        .reduce((s: number, a: any) => s + Number(a.value || 0), 0);
      return {
        ad_account_id: data.adAccountId,
        date: d.date_start,
        spend: Number(d.spend || 0),
        impressions: Number(d.impressions || 0),
        reach: Number(d.reach || 0),
        clicks: Number(d.clicks || 0),
        ctr: Number(d.ctr || 0),
        conversions,
        raw: d,
      };
    });

    if (rows.length) {
      const { error } = await context.supabase
        .from("ad_insights" as any)
        .upsert(rows, { onConflict: "ad_account_id,date" });
      if (error) return { ok: false, error: error.message, count: 0 };
    }
    return { ok: true, error: null, count: rows.length };
  });
