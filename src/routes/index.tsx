import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Users as UsersIcon, UserPlus, UserMinus, Wallet, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TraffixPro" },
      { name: "description", content: "Visão executiva da agência: clientes, contratos e MRR." },
    ],
  }),
  component: DashboardPage,
});

type Period = "day" | "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  year: "Ano",
  all: "Todos",
};

function toIso(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function rangeFor(p: Period): { since: string; until: string } {
  const now = new Date();
  const today = toIso(now);
  if (p === "day") return { since: today, until: today };
  if (p === "week") return { since: toIso(addDays(now, -6)), until: today };
  if (p === "month") return { since: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), until: today };
  if (p === "year") return { since: toIso(new Date(now.getFullYear(), 0, 1)), until: today };
  return { since: "1900-01-01", until: today };
}

type Stats = {
  active: number;
  total: number;
  newInPeriod: number;
  churnedInPeriod: number;
  churnRate: number;
  mrr: number;
};

function DashboardPage() {
  const { profile, user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => rangeFor(period), [period]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("clients")
        .select("id, status, contract_value, created_at, cancelled_at");
      const all = ((data ?? []) as unknown) as Array<{
        id: string; status: string; contract_value: number | string | null;
        created_at: string; cancelled_at: string | null;
      }>;
      const active = all.filter((c) => c.status === "ativo").length;
      const newInPeriod = all.filter((c) => {
        const d = c.created_at.slice(0, 10);
        return d >= range.since && d <= range.until;
      }).length;
      const churnedInPeriod = all.filter((c) => {
        if (!c.cancelled_at) return false;
        const d = c.cancelled_at.slice(0, 10);
        return d >= range.since && d <= range.until;
      }).length;
      const activeAtStart = all.filter((c) => {
        const created = c.created_at.slice(0, 10);
        if (created > range.since) return false;
        if (!c.cancelled_at) return true;
        return c.cancelled_at.slice(0, 10) >= range.since;
      }).length;
      const churnRate = activeAtStart ? (churnedInPeriod / activeAtStart) * 100 : 0;
      const mrr = all
        .filter((c) => c.status === "ativo")
        .reduce((s, c) => s + Number(c.contract_value ?? 0), 0);
      setStats({ active, total: all.length, newInPeriod, churnedInPeriod, churnRate, mrr });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [range.since, range.until]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "gestor";

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Visão geral · {PERIOD_LABELS[period]}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Olá, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Indicadores estratégicos da agência.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-lg bg-secondary border border-border/60">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition",
                    period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {PERIOD_LABELS[p]}
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

        {loading && !stats ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Clientes ativos"
              value={num(stats?.active ?? 0)}
              hint={`${num(stats?.total ?? 0)} no total`}
              icon={UsersIcon}
              accent="primary"
              highlight
            />
            <KpiCard
              label="Novos contratos"
              value={num(stats?.newInPeriod ?? 0)}
              hint="No período selecionado"
              icon={UserPlus}
              accent="success"
            />
            <KpiCard
              label="Churn"
              value={pct(stats?.churnRate ?? 0)}
              hint={`${num(stats?.churnedInPeriod ?? 0)} cancelados`}
              icon={UserMinus}
              accent="warning"
            />
            <KpiCard
              label="MRR contratado"
              value={brl(stats?.mrr ?? 0)}
              hint="Soma dos contratos ativos"
              icon={Wallet}
              accent="success"
              highlight
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}