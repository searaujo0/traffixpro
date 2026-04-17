import { supabase } from "@/integrations/supabase/client";

export type ClientRow = {
  id: string;
  name: string;
  segment: string | null;
  status: string;
  owner_user_id: string | null;
  created_at: string;
};

export type CampaignRow = {
  id: string;
  client_id: string;
  name: string;
  status: string;
  spend: number;
  conversations: number;
  clicks: number;
  impressions: number;
  reach: number;
  ctr: number;
  created_at: string;
};

export type SaleRow = {
  id: string;
  client_id: string;
  quantity: number;
  unit_value: number;
  sale_date: string;
  notes: string | null;
};

export async function fetchClients() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function fetchClient(id: string) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ClientRow | null;
}

export async function fetchCampaigns(clientId?: string) {
  let q = supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CampaignRow[];
}

export async function fetchSales(clientId?: string) {
  let q = supabase.from("sales").select("*").order("sale_date", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SaleRow[];
}

export function aggregate(campaigns: CampaignRow[], sales: SaleRow[]) {
  const spend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
  const conversations = campaigns.reduce((s, c) => s + c.conversations, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const reach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalSales = sales.reduce((s, x) => s + x.quantity, 0);
  const revenue = sales.reduce((s, x) => s + x.quantity * Number(x.unit_value), 0);
  return {
    spend,
    conversations,
    clicks,
    impressions,
    reach,
    sales: totalSales,
    revenue,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    costPerConversation: conversations ? spend / conversations : 0,
    costPerSale: totalSales ? spend / totalSales : 0,
    roi: spend ? ((revenue - spend) / spend) * 100 : 0,
  };
}
