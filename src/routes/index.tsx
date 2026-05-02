import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign, Target, TrendingUp, Wallet, Receipt, MousePointerClick, Eye,
  Users as UsersIcon, Loader2, Plug, RefreshCw, UserPlus, UserMinus, Activity,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { brl, brlPrecise, num, pct, dateBR } from "@/lib/format";
import { fetchDashboard, type DashboardSummary, type DailyPoint } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — M1 Digital" },
      { name: "description", content: "Acompanhe investimento, leads, ROI, churn e novos contratos da agência." },
    ],
  }),
  component: DashboardPage,
});

type Quick = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom";

function toIso(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function rangeFromQuick(q: Quick, customSince?: Date, customUntil?: Date): { since: string; until: string } {
  const now = new Date();
  const today = toIso(now);
  if (q === "today") return { since: today, until: today };
  if (q === "7d") return { since: toIso(addDays(now, -6)), until: today };
  if (q === "30d") return { since: toIso(addDays(now, -29)), until: today };
  if (q === "thisMonth") return { since: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), until: today };
  if (q === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { since: toIso(first), until: toIso(last) };
  }
  if (customSince && customUntil) return { since: toIso(customSince), until: toIso(customUntil) };
  return { since: today, until: today };
}

const quickLabels: Record<Quick, string> = {
  today: "Hoje", "7d": "7 dias", "30d": "30 dias",
  thisMonth: "Este mês", lastMonth: "Mês passado", custom: "Personalizado",
};

type ClientStats = {
  total: number;
  active: number;
  inactive: number;
  newInPeriod: number;
  churnedInPeriod: number;
  churnRate: number;
  mrr: number;
};

function DashboardPage() {
  const { profile, user } = useAuth();
  const [quick, setQuick] = useState<Quick>("30d");
  const [customSince, setCustomSince] = useState<Date | undefined>();
  const [customUntil, setCustomUntil] = useState<Date | undefined>();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => rangeFromQuick(quick, customSince, customUntil), [quick, customSince, customUntil]);

  async function loadClientStats() {
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, status, contract_value, created_at, cancelled_at");
    const all = ((clientsData ?? []) as unknown) as Array<{ id: string; status: string; contract_value: number | string | null; created_at: string; cancelled_at: string | null }>;
    const active = all.filter((c) => c.status === "ativo").length;
    const inactive = all.filter((c) => c.status !== "ativo").length;
    const newInPeriod = all.filter((c) => c.created_at.slice(0, 10) >= range.since && c.created_at.slice(0, 10) <= range.until).length;
    // Churn preciso: clientes cancelados dentro do período selecionado
    const churnedInPeriod = all.filter((c) => {
      if (!c.cancelled_at) return false;
      const d = c.cancelled_at.slice(0, 10);
      return d >= range.since && d <= range.until;
    }).length;
    // Base = clientes ativos no início do período + churn no período
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
    setClientStats({ total: all.length, active, inactive, newInPeriod, churnedInPeriod, churnRate, mrr });
  }

  async function load() {
    setLoading(true);
    try {
      const [r] = await Promise.all([
        fetchDashboard({ since: range.since, until: range.until }),
        loadClientStats(),
      ]);
      setSummary(r.summary);
      setDaily(r.daily);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [range.since, range.until]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "gestor";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Visão geral · {quickLabels[quick]}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Olá, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.hasData
                ? <>As campanhas geraram <span className="text-foreground font-medium">{brl(summary.revenue)}</span> em faturamento — ROI <span className="text-success font-medium">{pct(summary.roi)}</span>.</>
                : "Conecte uma conta de anúncios para começar a ver resultados."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex flex-wrap p-1 rounded-lg bg-secondary border border-border/60">
              {(["today", "7d", "30d", "thisMonth", "lastMonth"] as Quick[]).map((p) => (
                <button key={p} onClick={() => setQuick(p)}
                  className={cn("px-3 py-1.5 rounded-md font-medium transition",
                    quick === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {quickLabels[p]}
                </button>
              ))}
              <button onClick={() => setQuick("custom")}
                className={cn("px-3 py-1.5 rounded-md font-medium transition",
                  quick === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                Personalizado
              </button>
            </div>
            {quick === "custom" && (
              <div className="flex items-center gap-2">
                <DatePick value={customSince} onChange={setCustomSince} placeholder="Início" />
                <span className="text-muted-foreground">até</span>
                <DatePick value={customUntil} onChange={setCustomUntil} placeholder="Fim" />
              </div>
            )}
            <button onClick={load} disabled={loading} title="Atualizar"
              className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading && !summary ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Carteira da agência */}
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Carteira da agência
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Clientes ativos"
                  value={num(clientStats?.active ?? 0)}
                  hint={`${num(clientStats?.total ?? 0)} no total`}
                  icon={UsersIcon}
                  accent="primary"
                  highlight
                />
                <KpiCard
                  label="Novos contratos"
                  value={num(clientStats?.newInPeriod ?? 0)}
                  hint={`No período selecionado`}
                  icon={UserPlus}
                  accent="success"
                />
                <KpiCard
                  label="Churn"
                  value={pct(clientStats?.churnRate ?? 0)}
                  hint={`${num(clientStats?.churnedInPeriod ?? 0)} inativos`}
                  icon={UserMinus}
                  accent="warning"
                />
                <KpiCard
                  label="MRR contratado"
                  value={brl(clientStats?.mrr ?? 0)}
                  hint="Soma dos contratos ativos"
                  icon={Wallet}
                  accent="success"
                />
              </div>
            </section>

            {!summary?.hasData ? (
              <EmptyState />
            ) : (
              <>
                <section>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Resultado financeiro
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <KpiCard label="Faturamento total" value={brl(summary.revenue)}
                      hint={`${summary.salesCount} venda${summary.salesCount === 1 ? "" : "s"}`}
                      icon={Wallet} accent="success" highlight />
                    <KpiCard label="ROI" value={pct(summary.roi)}
                      hint={`ROAS ${summary.roas.toFixed(2).replace(".", ",")}x`}
                      icon={TrendingUp} accent="primary" highlight />
                    <KpiCard label="Custo por lead" value={summary.cpl ? brlPrecise(summary.cpl) : "—"}
                      hint={`Investimento ${brl(summary.spend)}`}
                      icon={Receipt} accent="warning" highlight />
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Métricas de tráfego
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard label="Investimento" value={brl(summary.spend)} icon={DollarSign} />
                    <KpiCard label="Leads / Conversões" value={num(summary.conversions)}
                      hint={summary.cpl ? `${brlPrecise(summary.cpl)} por lead` : undefined}
                      icon={Target} accent="success" />
                    <KpiCard label="Cliques no link" value={num(summary.clicks)}
                      hint={`CTR ${pct(summary.ctr)} · CPC ${summary.cpc ? brlPrecise(summary.cpc) : "—"}`}
                      icon={MousePointerClick} />
                    <KpiCard label="CPM" value={summary.cpm ? brlPrecise(summary.cpm) : "—"}
                      hint="Custo por mil impressões" icon={DollarSign} accent="primary" />
                    <KpiCard label="Impressões" value={num(summary.impressions)} icon={Eye} />
                    <KpiCard label="Alcance" value={num(summary.reach)} icon={UsersIcon} />
                    <KpiCard label="Frequência" value={(summary.frequency || 0).toFixed(2).replace(".", ",")} icon={Activity} />
                    <KpiCard label="Mensagens" value={num(summary.messages)}
                      hint={summary.costPerMessage ? `${brlPrecise(summary.costPerMessage)}/msg` : undefined}
                      icon={MousePointerClick} />
                  </div>
                </section>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold">Performance — {quickLabels[quick]}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Evolução diária de investimento e leads</p>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={daily.map((d) => ({ ...d, dateLabel: dateBR(d.date) }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.12)" />
                        <XAxis dataKey="dateLabel" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => brl(v)} />
                        <YAxis yAxisId="right" orientation="right" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                          formatter={((value: unknown, name: unknown) => {
                            const v = Number(value); const n = String(name);
                            if (n === "Investimento") return [brl(v), n];
                            return [num(v), n];
                          }) as never} />
                        <Area yAxisId="left" type="monotone" dataKey="spend" name="Investimento" stroke="#2B73BB" strokeWidth={2} fill="url(#gradSpend)" />
                        <Area yAxisId="right" type="monotone" dataKey="conversions" name="Leads" stroke="#10b981" strokeWidth={2} fill="url(#gradConv)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
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
      <h3 className="text-lg font-semibold">Sem dados de campanhas no período</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Conecte sua conta do Meta Ads e sincronize os dados para acompanhar o desempenho das campanhas.
      </p>
      <Link to="/integracoes/meta"
        className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition">
        <Plug className="h-4 w-4" /> Conectar Meta Ads
      </Link>
    </div>
  );
}

function DatePick({ value, onChange, placeholder }: { value?: Date; onChange: (d: Date | undefined) => void; placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(value, "dd/MM/yyyy") : (placeholder || "Selecionar")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}