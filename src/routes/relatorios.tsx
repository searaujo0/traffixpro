import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { brl, dateBR, num, pct } from "@/lib/format";
import { fetchDashboard, type DailyPoint, type DashboardSummary, type Period } from "@/lib/dashboard";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — TraffixPro" },
      { name: "description", content: "Relatórios consolidados das suas campanhas." },
    ],
  }),
  component: RelatoriosPage,
});

const labels: Record<Period, string> = { today: "Hoje", "7d": "7 dias", "30d": "30 dias" };

function RelatoriosPage() {
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consolidado · {labels[period]}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex p-1 rounded-lg bg-secondary border border-border/60">
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
              onClick={load}
              disabled={loading}
              className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center"
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
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Sem dados para este período. Sincronize as campanhas em Meta Ads.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Investimento" value={brl(summary.spend)} />
              <Stat label="Faturamento" value={brl(summary.revenue)} />
              <Stat label="ROI" value={pct(summary.roi)} />
              <Stat label="Leads" value={num(summary.conversions)} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-base font-semibold mb-4">Evolução diária</h3>
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
                      formatter={((value: unknown) => [brl(Number(value)), "Investimento"]) as never}
                    />
                    <Area type="monotone" dataKey="spend" stroke="oklch(0.7 0.18 265)" strokeWidth={2} fill="url(#g1)" />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
