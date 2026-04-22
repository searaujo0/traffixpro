import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Link2,
  Loader2,
  TrendingUp,
  Wallet,
  Target,
  ShoppingBag,
  Eye,
  MousePointerClick,
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
import { supabase } from "@/integrations/supabase/client";
import { brl, brlPrecise, dateBR, num, pct } from "@/lib/format";
import {
  fetchDashboard,
  type DashboardSummary,
  type DailyPoint,
  type Period,
} from "@/lib/dashboard";
import { exportElementToPDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Detalhe do cliente — TraffixPro" },
      { name: "description", content: "Relatório completo do cliente." },
    ],
  }),
  component: ClientDetailPage,
});

const labels: Record<Period, string> = { today: "Hoje", "7d": "7 dias", "30d": "30 dias" };

type ClientLite = { id: string; name: string; segment: string | null; status: string };

function ClientDetailPage() {
  const { id } = useParams({ from: "/clientes/$id" });
  const [client, setClient] = useState<ClientLite | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, period]);

  async function load() {
    setLoading(true);
    try {
      const { data: c } = await supabase
        .from("clients")
        .select("id, name, segment, status")
        .eq("id", id)
        .maybeSingle();
      setClient((c as ClientLite | null) ?? null);
      if (c) {
        const r = await fetchDashboard(period, id);
        setSummary(r.summary);
        setDaily(r.daily);
      }
    } catch {
      toast.error("Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/clientes/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  async function handleExport() {
    if (!reportRef.current || !client) return;
    toast.info("Gerando PDF...");
    try {
      await exportElementToPDF(
        reportRef.current,
        `relatorio-${client.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        `Relatório • ${client.name}`,
      );
      toast.success("PDF gerado");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  }

  return (
    <AppLayout>
      {loading && !client ? (
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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex p-1 rounded-lg bg-secondary border border-border/60 text-xs">
                {(["today", "7d", "30d"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {labels[p]}
                  </button>
                ))}
              </div>
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
            {!summary?.hasData ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Sem dados para este período. Vincule uma conta de anúncios e sincronize.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="Faturamento" value={brl(summary.revenue)} icon={Wallet} accent="primary" />
                  <KpiCard label="ROI" value={pct(summary.roi)} icon={TrendingUp} accent="success" />
                  <KpiCard label="Investimento" value={brl(summary.spend)} icon={Target} />
                  <KpiCard label="Vendas" value={num(summary.salesCount)} icon={ShoppingBag} accent="warning" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="Leads" value={num(summary.conversions)} icon={Target} hint={summary.cpl ? `CPL ${brlPrecise(summary.cpl)}` : undefined} />
                  <KpiCard label="Cliques" value={num(summary.clicks)} icon={MousePointerClick} hint={`CTR ${pct(summary.ctr)}`} />
                  <KpiCard label="Impressões" value={num(summary.impressions)} icon={Eye} />
                  <KpiCard label="ROAS" value={`${summary.roas.toFixed(2).replace(".", ",")}x`} icon={TrendingUp} />
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <h3 className="text-base font-semibold mb-4">Performance diária</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={daily.map((d) => ({ ...d, dateLabel: dateBR(d.date) }))}>
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="oklch(0.7 0.18 265)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="oklch(0.7 0.18 265)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                        <XAxis dataKey="dateLabel" stroke="oklch(0.68 0.03 260)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => brl(v)} />
                        <Tooltip
                          contentStyle={{ background: "oklch(0.205 0.022 265)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }}
                          formatter={((v: unknown) => [brl(Number(v)), "Investimento"]) as never}
                        />
                        <Area type="monotone" dataKey="spend" stroke="oklch(0.7 0.18 265)" fill="url(#g1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
