import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Atualiza dados gerais e financeiros de um cliente */
export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    name: string;
    segment: string | null;
    status: string;
    contract_value?: number;
    marketing_team_cost?: number;
    commission_pct?: number;
    contact_email?: string | null;
    notes?: string | null;
  }) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200),
      segment: z.string().max(200).nullable(),
      status: z.enum(["ativo", "inativo"]),
      contract_value: z.number().min(0).optional(),
      marketing_team_cost: z.number().min(0).optional(),
      commission_pct: z.number().min(0).max(100).optional(),
      contact_email: z.string().email().max(255).nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const update: Record<string, unknown> = {
      name: data.name,
      segment: data.segment,
      status: data.status,
    };
    if (data.contract_value !== undefined) update.contract_value = data.contract_value;
    if (data.marketing_team_cost !== undefined) update.marketing_team_cost = data.marketing_team_cost;
    if (data.commission_pct !== undefined) update.commission_pct = data.commission_pct;
    if (data.contact_email !== undefined) update.contact_email = data.contact_email;
    if (data.notes !== undefined) update.notes = data.notes;
    const { error } = await context.supabase
      .from("clients")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(update as any)
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });
/** Cria um novo cliente com dados financeiros completos */
export const createClientFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(1).max(200),
      segment: z.string().max(200).nullable().optional(),
      contact_email: z.string().email().max(255).nullable().optional(),
      contract_value: z.number().min(0).default(0),
      marketing_team_cost: z.number().min(0).default(0),
      commission_pct: z.number().min(0).max(100).default(0),
      notes: z.string().max(2000).nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        name: data.name,
        segment: data.segment ?? null,
        contact_email: data.contact_email ?? null,
        contract_value: data.contract_value,
        marketing_team_cost: data.marketing_team_cost,
        commission_pct: data.commission_pct,
        notes: data.notes ?? null,
      } as any)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message, id: null as string | null };
    return { ok: true, error: null, id: (row?.id as string) ?? null };
  });

/** Exclui cliente: desvincula contas, apaga vendas e remove o cliente. Mantém usuário de auth. */
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // 1. Desvincula contas de anúncio
    const { error: unlinkErr } = await context.supabase
      .from("ad_accounts" as any)
      .update({ client_id: null, updated_at: new Date().toISOString() })
      .eq("client_id", data.id);
    if (unlinkErr) return { ok: false, error: `Falha ao desvincular contas: ${unlinkErr.message}` };

    // 2. Apaga vendas
    const { error: salesErr } = await context.supabase
      .from("sales")
      .delete()
      .eq("client_id", data.id);
    if (salesErr) return { ok: false, error: `Falha ao apagar vendas: ${salesErr.message}` };

    // 3. Apaga o cliente
    const { error: clientErr } = await context.supabase
      .from("clients")
      .delete()
      .eq("id", data.id);
    if (clientErr) return { ok: false, error: clientErr.message };

    return { ok: true, error: null };
  });