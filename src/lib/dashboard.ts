import { supabase } from "@/integrations/supabase/client";

export type Period = "today" | "7d" | "30d";

export type DashboardSummary = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpl: number;
  // sales (from sales table)
  revenue: number;
  salesCount: number;
  roi: number;
  roas: number;
  hasData: boolean;
};

export type DailyPoint = {
  date: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
};

export type AccountPerformance = {
  id: string;
  name: string;
  currency: string | null;
  status: string | null;
  business_name: string | null;
  client_id: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpl: number;
};

function rangeFor(period: Period): { since: string; until: string } {
  const today = new Date();
  const until = today.toISOString().slice(0, 10);
  const days = period === "today" ? 0 : period === "7d" ? 6 : 29;
  const since = new Date(today.getTime() - days * 86400_000).toISOString().slice(0, 10);
  return { since, until };
}

export async function fetchDashboard(
  period: Period,
  clientId?: string,
): Promise<{ summary: DashboardSummary; daily: DailyPoint[] }> {
  const { since, until } = rangeFor(period);

  // Insights query — RLS filtra automaticamente (admin vê tudo, cliente vê só os seus)
  let insightsQuery = supabase
    .from("ad_insights")
    .select("date, spend, impressions, reach, clicks, conversions, ad_account_id, ad_accounts!inner(client_id)")
    .gte("date", since)
    .lte("date", until)
    .order("date", { ascending: true });

  if (clientId) {
    insightsQuery = insightsQuery.eq("ad_accounts.client_id", clientId);
  }

  const { data: insights, error: insErr } = await insightsQuery;
  if (insErr) throw insErr;

  // Sales — RLS filtra automaticamente
  let salesQuery = supabase
    .from("sales")
    .select("quantity, unit_value, sale_date, client_id")
    .gte("sale_date", since)
    .lte("sale_date", until);
  if (clientId) salesQuery = salesQuery.eq("client_id", clientId);
  const { data: sales, error: salesErr } = await salesQuery;
  if (salesErr) throw salesErr;

  // Aggregate per day
  const dailyMap = new Map<string, DailyPoint>();
  let spend = 0,
    impressions = 0,
    reach = 0,
    clicks = 0,
    conversions = 0;

  for (const r of insights ?? []) {
    const row = r as unknown as {
      date: string;
      spend: number | string;
      impressions: number | string;
      reach: number | string;
      clicks: number | string;
      conversions: number | string;
    };
    const s = Number(row.spend);
    const im = Number(row.impressions);
    const re = Number(row.reach);
    const cl = Number(row.clicks);
    const co = Number(row.conversions);
    spend += s;
    impressions += im;
    reach += re;
    clicks += cl;
    conversions += co;
    const cur = dailyMap.get(row.date) ?? {
      date: row.date,
      spend: 0,
      conversions: 0,
      clicks: 0,
      impressions: 0,
    };
    cur.spend += s;
    cur.conversions += co;
    cur.clicks += cl;
    cur.impressions += im;
    dailyMap.set(row.date, cur);
  }

  let revenue = 0;
  let salesCount = 0;
  for (const s of sales ?? []) {
    const row = s as unknown as { quantity: number; unit_value: number | string };
    revenue += Number(row.quantity) * Number(row.unit_value);
    salesCount += Number(row.quantity);
  }

  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const cpc = clicks ? spend / clicks : 0;
  const cpm = impressions ? (spend / impressions) * 1000 : 0;
  const cpl = conversions ? spend / conversions : 0;
  const roi = spend ? ((revenue - spend) / spend) * 100 : 0;
  const roas = spend ? revenue / spend : 0;

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    summary: {
      spend,
      impressions,
      reach,
      clicks,
      conversions,
      ctr,
      cpc,
      cpm,
      cpl,
      revenue,
      salesCount,
      roi,
      roas,
      hasData: (insights?.length ?? 0) > 0 || (sales?.length ?? 0) > 0,
    },
    daily,
  };
}

export async function fetchAccountPerformance(period: Period, clientId?: string): Promise<AccountPerformance[]> {
  const { since, until } = rangeFor(period);

  let accountsQuery = supabase
    .from("ad_accounts")
    .select("id, name, currency, status, business_name, client_id, last_sync_at, last_sync_status, last_sync_error")
    .order("name", { ascending: true });

  if (clientId) accountsQuery = accountsQuery.eq("client_id", clientId);

  const { data: accounts, error: accountsErr } = await accountsQuery;
  if (accountsErr) throw accountsErr;

  const ids = (accounts ?? []).map((a) => a.id);
  if (ids.length === 0) return [];

  const { data: insights, error: insightsErr } = await supabase
    .from("ad_insights")
    .select("ad_account_id, spend, impressions, reach, clicks, conversions")
    .in("ad_account_id", ids)
    .gte("date", since)
    .lte("date", until);
  if (insightsErr) throw insightsErr;

  const totals = new Map<string, Omit<AccountPerformance, "id" | "name" | "currency" | "status" | "business_name" | "client_id" | "last_sync_at" | "last_sync_status" | "last_sync_error" | "ctr" | "cpc" | "cpl">>();
  for (const r of insights ?? []) {
    const cur = totals.get(r.ad_account_id) ?? { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 };
    cur.spend += Number(r.spend);
    cur.impressions += Number(r.impressions);
    cur.reach += Number(r.reach);
    cur.clicks += Number(r.clicks);
    cur.conversions += Number(r.conversions);
    totals.set(r.ad_account_id, cur);
  }

  return (accounts ?? []).map((a) => {
    const t = totals.get(a.id) ?? { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 };
    return {
      ...a,
      ...t,
      ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0,
      cpc: t.clicks ? t.spend / t.clicks : 0,
      cpl: t.conversions ? t.spend / t.conversions : 0,
    };
  });
}
