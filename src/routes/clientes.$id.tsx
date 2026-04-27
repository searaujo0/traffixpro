import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Link2, Loader2, TrendingUp, Wallet, Target, ShoppingBag, MousePointerClick, Eye, Users, MessageCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchClient, fetchSales, type ClientRow, type SaleRow } from "@/lib/data";
import { fetchAccountPerformance, fetchDashboard, type AccountPerformance, type DailyPoint, type DashboardSummary } from "@/lib/dashboard";
import { brl, brlPrecise, dateBR, num, pct } from "@/lib/format";
import { generateClientReportPDF } from "@/lib/clientReportPdf";
import { META_METRIC_LABELS } from "@/lib/metaLabels";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do cliente — TraffixPro" },
      { name: "description", content: "Relatório completo do cliente com dados reais do Meta Ads." },
    ],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { id } = useParams({ from: "/clientes/$id" });
  const [client, setClient] = useState<ClientRow | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [accounts, setAccounts] = useState<AccountPerformance[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [c, dash, accs, sls] = await Promise.all([
        fetchClient(id),
        fetchDashboard("30d", id),
        fetchAccountPerformance("30d", id),
        fetchSales(id),
      ]);
      setClient(c);
      setSummary(dash.summary);
      setDaily(dash.daily);
      setAccounts(accs);
      setSales(sls);
    } catch {
      toast.error("Falha ao carregar dados reais do cliente");
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    await navigator.clipboard.writeText(`${window.location.origin}/clientes/${id}`);
    toast.success("Link copiado! O cliente precisa estar logado para acessar.");
  }

  async function handleExport() {
    if (!client || !summary) return;
    toast.info("Gerando relatório PDF...");
    try {
      await generateClientReportPDF({
        client,
        summary,
        daily,
        accounts,
        sales,
        periodLabel: "Últimos 30 dias",
      });
      toast.success("Relatório gerado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    }
  }

  return (
    <AppLayout>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !client || !summary ? (
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
          <Link to="/clientes" className="text-xs text-primary underline mt-2 inline-block">Voltar para clientes</Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/clientes" className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary transition">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">{client.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{client.segment ?? "—"} • {client.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-border bg-secondary/40 text-sm font-medium hover:bg-secondary transition">
                <Link2 className="h-4 w-4" /> Compartilhar
              </button>
              <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition">
                <Download className="h-4 w-4" /> Exportar PDF
              </button>
            </div>
          </div>

          <div className="space-y-6 bg-background">
            <ClientReport client={client} summary={summary} daily={daily} accounts={accounts} sales={sales} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ClientReport({ client, summary, daily, accounts, sales }: { client: ClientRow; summary: DashboardSummary; daily: DailyPoint[]; accounts: AccountPerformance[]; sales: SaleRow[] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento" value={brl(summary.revenue)} icon={Wallet} accent="primary" />
        <KpiCard label="ROI" value={pct(summary.roi)} icon={TrendingUp} accent="success" />
        <KpiCard label={META_METRIC_LABELS.spend} value={brl(summary.spend)} icon={Target} />
        <KpiCard label="Vendas" value={num(summary.salesCount)} icon={ShoppingBag} accent="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={summary.resultLabel || META_METRIC_LABELS.results} value={num(summary.conversions)} icon={MessageCircle} />
        <KpiCard label={META_METRIC_LABELS.costPerResult} value={summary.cpl ? brlPrecise(summary.cpl) : "—"} icon={Target} />
        <KpiCard label={META_METRIC_LABELS.linkClicks} value={num(summary.clicks)} icon={MousePointerClick} />
        <KpiCard label="Impressões" value={num(summary.impressions)} icon={Eye} />
        <KpiCard label="ROAS" value={`${summary.roas.toFixed(2).replace(".", ",")}x`} icon={TrendingUp} />
        <KpiCard label="Alcance" value={num(summary.reach)} icon={Users} />
        <KpiCard label="CTR" value={pct(summary.ctr)} icon={Target} />
        <KpiCard label="CPC" value={summary.cpc ? brlPrecise(summary.cpc) : "—"} icon={Target} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold mb-1">Performance diária — últimos 30 dias</h3>
        <p className="text-xs text-muted-foreground mb-4">Dados vindos das contas Meta Ads vinculadas a {client.name}.</p>
        {daily.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum insight sincronizado. Vincule uma conta e clique em sincronizar na integração Meta Ads.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily.map((d) => ({ ...d, dateLabel: dateBR(d.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis dataKey="dateLabel" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="spend" name="Investimento" stroke="#6366f1" fill="rgba(99, 102, 241, 0.18)" strokeWidth={2} />
                <Area type="monotone" dataKey="conversions" name="Leads" stroke="#10b981" fill="rgba(16, 185, 129, 0.12)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold mb-4">Contas vinculadas</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta de anúncio vinculada a este cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Conta</th><th className="py-2 pr-3">{META_METRIC_LABELS.spend}</th><th className="py-2 pr-3">{META_METRIC_LABELS.results}</th><th className="py-2 pr-3">{META_METRIC_LABELS.linkClicks}</th><th className="py-2 pr-3">Sync</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3"><span className="font-medium">{a.name}</span><br /><span className="text-xs text-muted-foreground">{a.id}</span></td>
                    <td className="py-2.5 pr-3">{brl(a.spend)}</td>
                    <td className="py-2.5 pr-3">{num(a.conversions)}<br /><span className="text-[10px] text-muted-foreground">{a.resultLabel}</span></td>
                    <td className="py-2.5 pr-3">{num(a.clicks)}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">{a.last_sync_at ? new Date(a.last_sync_at).toLocaleString("pt-BR") : "nunca"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold mb-4">Vendas registradas</h3>
        {sales.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma venda registrada no período.</p> : <p className="text-sm text-muted-foreground">{sales.length} registro{sales.length === 1 ? "" : "s"} de venda no histórico do cliente.</p>}
      </div>
    </>
  );
}
