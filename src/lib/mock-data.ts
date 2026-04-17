// Mock data realista para campanhas de tráfego pago WhatsApp
export type DailyMetric = {
  date: string;
  spend: number;
  conversations: number;
  clicks: number;
  impressions: number;
  reach: number;
  sales: number;
  revenue: number;
};

const today = new Date();
function dateNDaysAgo(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const dailyMetrics: DailyMetric[] = Array.from({ length: 30 }).map((_, i) => {
  const day = 29 - i;
  const base = 180 + Math.sin(i / 3) * 40 + Math.random() * 60;
  const spend = Math.round(base);
  const conversations = Math.round(spend / (8 + Math.random() * 4));
  const clicks = Math.round(conversations * (3 + Math.random() * 2));
  const impressions = Math.round(clicks * (40 + Math.random() * 20));
  const reach = Math.round(impressions * 0.65);
  const sales = Math.max(0, Math.round(conversations * 0.18));
  const revenue = sales * 700;
  return {
    date: dateNDaysAgo(day),
    spend,
    conversations,
    clicks,
    impressions,
    reach,
    sales,
    revenue,
  };
});

export const totals = dailyMetrics.reduce(
  (acc, d) => ({
    spend: acc.spend + d.spend,
    conversations: acc.conversations + d.conversations,
    clicks: acc.clicks + d.clicks,
    impressions: acc.impressions + d.impressions,
    reach: acc.reach + d.reach,
    sales: acc.sales + d.sales,
    revenue: acc.revenue + d.revenue,
  }),
  { spend: 0, conversations: 0, clicks: 0, impressions: 0, reach: 0, sales: 0, revenue: 0 }
);

export const kpis = {
  spend: totals.spend,
  conversations: totals.conversations,
  costPerConversation: totals.spend / totals.conversations,
  clicks: totals.clicks,
  ctr: (totals.clicks / totals.impressions) * 100,
  cpc: totals.spend / totals.clicks,
  cpm: (totals.spend / totals.impressions) * 1000,
  impressions: totals.impressions,
  reach: totals.reach,
  frequency: totals.impressions / totals.reach,
  conversionRate: (totals.conversations / totals.clicks) * 100,
  revenue: totals.revenue,
  sales: totals.sales,
  costPerSale: totals.spend / Math.max(totals.sales, 1),
  roi: ((totals.revenue - totals.spend) / totals.spend) * 100,
};

export const audienceAge = [
  { range: "18-24", value: 14 },
  { range: "25-34", value: 38 },
  { range: "35-44", value: 27 },
  { range: "45-54", value: 14 },
  { range: "55+", value: 7 },
];

export const audienceGender = [
  { name: "Feminino", value: 58 },
  { name: "Masculino", value: 41 },
  { name: "Outros", value: 1 },
];

export const audienceRegion = [
  { region: "São Paulo", value: 32 },
  { region: "Rio de Janeiro", value: 18 },
  { region: "Minas Gerais", value: 12 },
  { region: "Bahia", value: 9 },
  { region: "Paraná", value: 8 },
  { region: "Outros", value: 21 },
];

export const clients = [
  { id: "1", name: "Studio Belle", segment: "Estética", spend: 3240, revenue: 18900, status: "ativo" },
  { id: "2", name: "Pizzaria Don Carlo", segment: "Alimentação", spend: 1980, revenue: 9100, status: "ativo" },
  { id: "3", name: "Auto Center Veloz", segment: "Automotivo", spend: 2750, revenue: 14200, status: "ativo" },
  { id: "4", name: "Clínica VitaMais", segment: "Saúde", spend: 4120, revenue: 26800, status: "ativo" },
  { id: "5", name: "Imobiliária Prime", segment: "Imóveis", spend: 5800, revenue: 42000, status: "pausado" },
];

export const campaigns = [
  { id: "c1", name: "Promo Mês das Mães", client: "Studio Belle", status: "ativa", spend: 1240, conv: 142, ctr: 2.4 },
  { id: "c2", name: "Pizza Sexta", client: "Pizzaria Don Carlo", status: "ativa", spend: 980, conv: 98, ctr: 3.1 },
  { id: "c3", name: "Revisão Completa", client: "Auto Center Veloz", status: "ativa", spend: 1450, conv: 76, ctr: 1.8 },
  { id: "c4", name: "Check-up Anual", client: "Clínica VitaMais", status: "ativa", spend: 2120, conv: 188, ctr: 2.9 },
  { id: "c5", name: "Lançamento Residencial", client: "Imobiliária Prime", status: "pausada", spend: 3800, conv: 64, ctr: 1.2 },
];

export const insights = [
  {
    type: "warning" as const,
    title: "CPL acima da média na campanha 'Lançamento Residencial'",
    description: "O custo por lead está 42% acima do benchmark do segmento. Recomendamos testar 3 novos criativos.",
    action: "Testar novos criativos",
  },
  {
    type: "success" as const,
    title: "Campanha 'Check-up Anual' performando muito bem",
    description: "ROI de 312% nos últimos 7 dias. Considere aumentar o orçamento em 30%.",
    action: "Escalar orçamento",
  },
  {
    type: "warning" as const,
    title: "Frequência alta detectada",
    description: "A frequência média está em 4.2. O público pode estar saturado — troque os criativos.",
    action: "Renovar criativos",
  },
  {
    type: "info" as const,
    title: "CTR baixo em 'Revisão Completa'",
    description: "CTR de 1.8% indica anúncio pouco atrativo. Reescreva o headline e teste novas thumbs.",
    action: "Otimizar anúncio",
  },
];
