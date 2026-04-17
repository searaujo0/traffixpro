import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Link2,
  Loader2,
  TrendingUp,
  Wallet,
  MessageCircle,
  Target,
  ShoppingBag,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aggregate,
  fetchCampaigns,
  fetchClient,
  fetchSales,
  type CampaignRow,
  type ClientRow,
  type SaleRow,
} from "@/lib/data";
import { brl, num, pct } from "@/lib/format";
import { exportElementToPDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do cliente — TraffixPro" },
      { name: "description", content: "Relatório completo do cliente." },
    ],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { id } = useParams({ from: "/clientes/$id" });
  const [client, setClient] = useState<ClientRow | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [c, camps, sls] = await Promise.all([
        fetchClient(id),
        fetchCampaigns(id),
        fetchSales(id),
      ]);
      setClient(c);
      setCampaigns(camps);
      setSales(sls);
    } catch (e) {
      toast.error("Falha ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/clientes/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado! O cliente precisa estar logado para acessar.");
  }

  async function handleExport() {
    if (!reportRef.current || !client) return;
    toast.info("Gerando PDF...");
    try {
      await exportElementToPDF(
        reportRef.current,
        `relatorio-${client.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        `Relatório • ${client.name}`
      );
      toast.success("PDF gerado");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  }

  return (
    <AppLayout>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !client ? (
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
          <Link to="/clientes" className="text-xs text-primary underline mt-2 inline-block">
            Voltar para clientes
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/clientes"
                className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">{client.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {client.segment ?? "—"} • {client.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-border bg-secondary/40 text-sm font-medium hover:bg-secondary transition"
              >
                <Link2 className="h-4 w-4" /> Compartilhar
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition"
              >
                <Download className="h-4 w-4" /> Exportar PDF
              </button>
            </div>
          </div>

          <div ref={reportRef} className="space-y-6 bg-background">
            <ClientReport client={client} campaigns={campaigns} sales={sales} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ClientReport({
  client,
  campaigns,
  sales,
}: {
  client: ClientRow;
  campaigns: CampaignRow[];
  sales: SaleRow[];
}) {
  const m = aggregate(campaigns, sales);

  const chartData = campaigns.map((c) => ({
    name: c.name.slice(0, 14),
    spend: Number(c.spend),
    conv: c.conversations,
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento" value={brl(m.revenue)} icon={Wallet} accent="primary" />
        <KpiCard label="ROI" value={pct(m.roi)} icon={TrendingUp} accent="success" />
        <KpiCard label="Investimento" value={brl(m.spend)} icon={Target} />
        <KpiCard label="Vendas" value={num(m.sales)} icon={ShoppingBag} accent="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Conversas" value={num(m.conversations)} icon={MessageCircle} />
        <KpiCard label="Custo / conversa" value={brl(m.costPerConversation)} icon={Target} />
        <KpiCard label="Cliques" value={num(m.clicks)} icon={Target} />
        <KpiCard label="CTR" value={pct(m.ctr)} icon={Target} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold mb-4">Performance por campanha</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma campanha cadastrada para este cliente.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.18 265)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.7 0.18 265)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="name" stroke="oklch(0.68 0.03 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.205 0.022 265)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="spend" stroke="oklch(0.7 0.18 265)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold mb-4">Campanhas</h3>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma campanha.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Campanha</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Investido</th>
                  <th className="py-2 pr-3">Conversas</th>
                  <th className="py-2 pr-3">CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{c.status}</td>
                    <td className="py-2.5 pr-3">{brl(Number(c.spend))}</td>
                    <td className="py-2.5 pr-3">{num(c.conversations)}</td>
                    <td className="py-2.5 pr-3">{Number(c.ctr).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
