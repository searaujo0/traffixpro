import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Receipt, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl, pct } from "@/lib/format";
import { fetchDashboard } from "@/lib/dashboard";

export const Route = createFileRoute("/comissoes")({
  head: () => ({
    meta: [
      { title: "Comissões — M1 Digital" },
      { name: "description", content: "Comissões a receber por cliente, calculadas a partir do lucro mensal." },
    ],
  }),
  component: ComissoesPage,
});

type ClientLite = {
  id: string;
  name: string;
  commission_pct: number;
  marketing_team_cost: number;
};

type Row = ClientLite & {
  spend: number;
  revenue: number;
  profit: number;
  commission: number;
};

function monthRange(year: number, month: number) {
  const since = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const until = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { since, until };
}

function ComissoesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function load() {
    setLoading(true);
    const { data: clients } = await supabase
      .from("clients")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, name, commission_pct, marketing_team_cost" as any)
      .order("name", { ascending: true });
    const list = ((clients ?? []) as unknown) as ClientLite[];
    const range = monthRange(year, month);
    const enriched = await Promise.all(
      list.map(async (c) => {
        const r = await fetchDashboard({ since: range.since, until: range.until }, c.id);
        const spend = r.summary.spend;
        const revenue = r.summary.revenue;
        const profit = revenue - spend - Number(c.marketing_team_cost ?? 0);
        const commission = profit > 0 ? profit * (Number(c.commission_pct ?? 0) / 100) : 0;
        return { ...c, spend, revenue, profit, commission } as Row;
      }),
    );
    setRows(enriched);
    setLoading(false);
  }

  const totalCommission = useMemo(() => rows.reduce((s, r) => s + r.commission, 0), [rows]);
  const totalProfit = useMemo(() => rows.reduce((s, r) => s + r.profit, 0), [rows]);

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Comissões a Receber</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calculado como <strong>% configurado × lucro do mês</strong> (Faturamento − Investimento − Custo da Equipe).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {monthNames.map((n, i) => (
                <option key={n} value={i + 1}>{n}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total a receber</p>
            <p className="text-3xl font-semibold mt-1 text-success flex items-center gap-2">
              <Receipt className="h-6 w-6" /> {brl(totalCommission)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lucro consolidado dos clientes</p>
            <p className="text-3xl font-semibold mt-1 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> {brl(totalProfit)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clientes</p>
            <p className="text-3xl font-semibold mt-1">{rows.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-right px-4 py-3 font-medium">% Comissão</th>
                    <th className="text-right px-4 py-3 font-medium">Investido</th>
                    <th className="text-right px-4 py-3 font-medium">Faturado</th>
                    <th className="text-right px-4 py-3 font-medium">Custo equipe</th>
                    <th className="text-right px-4 py-3 font-medium">Lucro</th>
                    <th className="text-right px-4 py-3 font-medium">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-right">{pct(Number(r.commission_pct ?? 0))}</td>
                      <td className="px-4 py-3 text-right">{brl(r.spend)}</td>
                      <td className="px-4 py-3 text-right">{brl(r.revenue)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{brl(Number(r.marketing_team_cost ?? 0))}</td>
                      <td className={`px-4 py-3 text-right font-medium ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>{brl(r.profit)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{brl(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary/30">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold">Total</td>
                    <td className="px-4 py-3 text-right font-semibold">{brl(totalProfit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-success">{brl(totalCommission)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}