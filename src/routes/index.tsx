import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DollarSign,
  Target,
  TrendingUp,
  Wallet,
  Receipt,
  MousePointerClick,
  Eye,
  Users as UsersIcon,
  Loader2,
  Plug,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { useAuth } from "@/contexts/AuthContext";
import { brl, brlPrecise, num, pct, dateBR } from "@/lib/format";
import {
  fetchDashboard,
  type DashboardSummary,
  type DailyPoint,
  type Period,
} from "@/lib/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — M1 Digital" },
      {
        name: "description",
        content:
          "Acompanhe investimento, leads, ROI e faturamento das suas campanhas de tráfego pago em tempo real.",
      },
    ],
  }),
  component: DashboardPage,
});

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
};

function DashboardPage() {
  const { profile, user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetchDashboard(period);
      setSummary(r.summary);
      setDaily(r.daily);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "gestor";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Visão geral · {periodLabels[period]}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">
              Olá, {firstName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.hasData
                ? <>Suas campanhas geraram <span className="text-foreground font-medium">{brl(summary.revenue)}</span> em faturamento — ROI de <span className="text-success font-medium">{pct(summary.roi)}</span>.</>
                : "Conecte uma conta de anúncios para começar a ver resultados."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex p-1 rounded-lg bg-secondary border border-border/60">
              {(["today", "7d", "30d"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              title="Atualizar"
              className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading && !summary ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !summary?.hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Financial highlight */}
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Resultado financeiro
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  label="Faturamento total"
                  value={brl(summary.revenue)}
                  hint={`${summary.salesCount} venda${summary.salesCount === 1 ? "" : "s"} no período`}
                  icon={Wallet}
                  accent="success"
                  highlight
                />
                <KpiCard
                  label="ROI"
                  value={pct(summary.roi)}
                  hint={`ROAS ${summary.roas.toFixed(2).replace(".", ",")}x`}
                  icon={TrendingUp}
                  accent="primary"
                  highlight
                />
                <KpiCard
                  label="Custo por lead"
                  value={summary.cpl ? brlPrecise(summary.cpl) : "—"}
                  hint={`Investimento de ${brl(summary.spend)}`}
                  icon={Receipt}
                  accent="warning"
                  highlight
                />
              </div>
            </section>

            {/* Traffic KPIs */}
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Métricas de tráfego
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Investimento" value={brl(summary.spend)} icon={DollarSign} />
                <KpiCard
                  label="Leads / Conversões"
                  value={num(summary.conversions)}
                  hint={summary.cpl ? `${brlPrecise(summary.cpl)} por lead` : undefined}
                  icon={Target}
                  accent="success"
                />
                <KpiCard
                  label="Cliques no link"
                  value={num(summary.clicks)}
                  hint={`CTR ${pct(summary.ctr)} · CPC ${summary.cpc ? brlPrecise(summary.cpc) : "—"}`}
                  icon={MousePointerClick}
                />
                <KpiCard
                  label="CPM"
                  value={summary.cpm ? brlPrecise(summary.cpm) : "—"}
                  hint="Custo por mil impressões"
                  icon={DollarSign}
                  accent="primary"
                />
                <KpiCard label="Impressões" value={num(summary.impressions)} icon={Eye} />
                <KpiCard label="Alcance" value={num(summary.reach)} icon={UsersIcon} />
              </div>
            </section>

            {/* Chart */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Performance — {periodLabels[period]}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Evolução diária de investimento e leads
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={daily.map((d) => ({ ...d, dateLabel: dateBR(d.date) }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                    <XAxis dataKey="dateLabel" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => brl(v)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#161b22",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={((value: unknown, name: unknown) => {
                        const v = Number(value);
                        const n = String(name);
                        if (n === "Investimento") return [brl(v), n];
                        return [num(v), n];
                      }) as never}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="spend" name="Investimento" stroke="#6366f1" strokeWidth={2} fill="url(#gradSpend)" />
                    <Area yAxisId="right" type="monotone" dataKey="conversions" name="Leads" stroke="#10b981" strokeWidth={2} fill="url(#gradConv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Plug className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">Nenhum dado por aqui ainda</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Conecte sua conta do Meta Ads, importe contas de anúncio e sincronize os dados para começar a acompanhar o desempenho em tempo real.
      </p>
      <Link
        to="/integracoes/meta"
        className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition"
      >
        <Plug className="h-4 w-4" /> Conectar Meta Ads
      </Link>
    </div>
  );
}
