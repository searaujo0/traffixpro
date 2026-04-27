import { supabase } from "@/integrations/supabase/client";
import { META_METRIC_LABELS } from "@/lib/metaLabels";

export type Period = "today" | "7d" | "30d";

export type DashboardSummary = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  messages: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpl: number;
  costPerMessage: number;
  frequency: number;
  revenue: number;
  salesCount: number;
  roi: number;
  roas: number;
  hasData: boolean;
  /** Nome do "Resultado" no período (ex.: "Leads", "Conversas iniciadas"). */
  resultLabel: string;
};

export type DailyPoint = {
  date: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  messages: number;
  salesValue: number;
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
  /** Rótulo do "Resultado" mais frequente para esta conta no período. */
  resultLabel: string;
};

function rangeFor(period: Period): { since: string; until: string } {
  const today = new Date();
  const until = today.toISOString().slice(0, 10);
  const days = period === "today" ? 0 : period === "7d" ? 6 : 29;
  const since = new Date(today.getTime() - days * 86400_000).toISOString().slice(0, 10);
  return { since, until };
}

export async function fetchDashboard(
  period: Period | { since: string; until: string },
  clientId?: string,
): Promise<{ summary: DashboardSummary; daily: DailyPoint[] }> {
  const { since, until } = typeof period === "string" ? rangeFor(period) : period;

  let insightsQuery = supabase
    .from("ad_insights")
    .select("date, spend, impressions, reach, clicks, conversions, messages, ad_account_id, ad_accounts!inner(client_id)")
    .gte("date", since)
    .lte("date", until)
    .order("date", { ascending: true });

  if (clientId) insightsQuery = insightsQuery.eq("ad_accounts.client_id", clientId);

  const { data: insights, error: insErr } = await insightsQuery;
  if (insErr) throw insErr;

  let salesQuery = supabase
    .from("sales")
    .select("quantity, unit_value, sale_date, client_id")
    .gte("sale_date", since)
    .lte("sale_date", until);
  if (clientId) salesQuery = salesQuery.eq("client_id", clientId);
  const { data: sales, error: salesErr } = await salesQuery;
  if (salesErr) throw salesErr;

  const dailyMap = new Map<string, DailyPoint>();
  let spend = 0;
  let impressions = 0;
  let reach = 0;
  let clicks = 0;
  let conversions = 0;
  let messages = 0;
  const labelCount = new Map<string, number>();

  for (const r of insights ?? []) {
    const row = r as unknown as {
      date: string;
      spend: number | string;
      impressions: number | string;
      reach: number | string;
      clicks: number | string;
      conversions: number | string;
      messages?: number | string | null;
      result_label?: string | null;
    };
    const s = Number(row.spend);
    const im = Number(row.impressions);
    const re = Number(row.reach);
    const cl = Number(row.clicks);
    const co = Number(row.conversions);
    const msg = Number(row.messages ?? 0);
    spend += s;
    impressions += im;
    reach += re;
    clicks += cl;
    conversions += co;
    messages += msg;
    if (row.result_label && co > 0) {
      labelCount.set(row.result_label, (labelCount.get(row.result_label) ?? 0) + co);
    }
    const cur = dailyMap.get(row.date) ?? { date: row.date, spend: 0, conversions: 0, clicks: 0, impressions: 0, messages: 0, salesValue: 0 };
    cur.spend += s;
    cur.conversions += co;
    cur.clicks += cl;
    cur.impressions += im;
    cur.messages += msg;
    dailyMap.set(row.date, cur);
  }

  let revenue = 0;
  let salesCount = 0;
  for (const s of sales ?? []) {
    const row = s as unknown as { quantity: number; unit_value: number | string; sale_date: string };
    const value = Number(row.quantity) * Number(row.unit_value);
    revenue += value;
    salesCount += Number(row.quantity);
    const cur = dailyMap.get(row.sale_date) ?? { date: row.sale_date, spend: 0, conversions: 0, clicks: 0, impressions: 0, messages: 0, salesValue: 0 };
    cur.salesValue += value;
    dailyMap.set(row.sale_date, cur);
  }

  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const cpc = clicks ? spend / clicks : 0;
  const cpm = impressions ? (spend / impressions) * 1000 : 0;
  const cpl = conversions ? spend / conversions : 0;
  const costPerMessage = messages ? spend / messages : 0;
  const frequency = reach ? impressions / reach : 0;
  const roi = spend ? ((revenue - spend) / spend) * 100 : 0;
  const roas = spend ? revenue / spend : 0;
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Pega o rótulo de resultado mais "pesado" no período (mais ocorrências).
  let resultLabel: string = META_METRIC_LABELS.results;
  let best = 0;
  for (const [k, v] of labelCount) if (v > best) { best = v; resultLabel = k; }

  return {
    summary: { spend, impressions, reach, clicks, conversions, messages, ctr, cpc, cpm, cpl, costPerMessage, frequency, revenue, salesCount, roi, roas, hasData: (insights?.length ?? 0) > 0 || (sales?.length ?? 0) > 0, resultLabel },
    daily,
  };
}

export async function fetchAccountPerformance(period: Period, clientId?: string): Promise<AccountPerformance[]> {
  const { since, until } = rangeFor(period);

  let accountsQuery = supabase
    .from("ad_accounts" as any)
    .select("id, name, currency, status, business_name, client_id, last_sync_at, last_sync_status, last_sync_error")
    .order("name", { ascending: true });

  if (clientId) accountsQuery = accountsQuery.eq("client_id", clientId);

  const { data: accounts, error: accountsErr } = await accountsQuery;
  if (accountsErr) throw accountsErr;

  const typedAccounts = ((accounts ?? []) as unknown) as Array<Omit<AccountPerformance, "spend" | "impressions" | "reach" | "clicks" | "conversions" | "ctr" | "cpc" | "cpl" | "resultLabel">>;
  const ids = typedAccounts.map((a) => a.id);
  if (ids.length === 0) return [];

  const { data: insights, error: insightsErr } = await supabase
    .from("ad_insights")
    .select("ad_account_id, spend, impressions, reach, clicks, conversions, result_label")
    .in("ad_account_id", ids)
    .gte("date", since)
    .lte("date", until);
  if (insightsErr) throw insightsErr;

  const totals = new Map<string, { spend: number; impressions: number; reach: number; clicks: number; conversions: number }>();
  const labelByAccount = new Map<string, Map<string, number>>();
  for (const r of insights ?? []) {
    const row = r as unknown as { ad_account_id: string; spend: number | string; impressions: number | string; reach: number | string; clicks: number | string; conversions: number | string; result_label?: string | null };
    const cur = totals.get(row.ad_account_id) ?? { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 };
    cur.spend += Number(row.spend);
    cur.impressions += Number(row.impressions);
    cur.reach += Number(row.reach);
    cur.clicks += Number(row.clicks);
    cur.conversions += Number(row.conversions);
    totals.set(row.ad_account_id, cur);
    const co = Number(row.conversions);
    if (row.result_label && co > 0) {
      const m = labelByAccount.get(row.ad_account_id) ?? new Map<string, number>();
      m.set(row.result_label, (m.get(row.result_label) ?? 0) + co);
      labelByAccount.set(row.ad_account_id, m);
    }
  }

  return typedAccounts.map((a) => {
    const t = totals.get(a.id) ?? { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 };
    let resultLabel: string = META_METRIC_LABELS.results;
    const m = labelByAccount.get(a.id);
    if (m) {
      let best = 0;
      for (const [k, v] of m) if (v > best) { best = v; resultLabel = k; }
    }
    return { ...a, ...t, ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0, cpc: t.clicks ? t.spend / t.clicks : 0, cpl: t.conversions ? t.spend / t.conversions : 0, resultLabel };
  });
}
