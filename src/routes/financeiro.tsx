import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { kpis, dailyMetrics } from "@/lib/mock-data";
import { brl, dateBR, pct } from "@/lib/format";
import { Wallet, TrendingUp, Receipt, ShoppingBag, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — TraffixPro" },
      { name: "description", content: "Faturamento, ROI e custo por venda em destaque." },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const [sales, setSales] = useState("");
  const [price, setPrice] = useState("700");
  const recent = [...dailyMetrics].reverse().slice(0, 10);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Foco no que importa: quanto entrou e quanto sobrou.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Faturamento total" value={brl(kpis.revenue)} icon={Wallet} accent="success" highlight />
          <KpiCard label="ROI" value={pct(kpis.roi)} icon={TrendingUp} accent="primary" highlight />
          <KpiCard label="Custo por venda" value={brl(kpis.costPerSale)} icon={Receipt} accent="warning" highlight />
          <KpiCard label="Vendas" value={String(kpis.sales)} icon={ShoppingBag} highlight />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-semibold">Registrar vendas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione manualmente as vendas geradas.
            </p>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Quantidade de vendas
                </label>
                <input
                  type="number"
                  value={sales}
                  onChange={(e) => setSales(e.target.value)}
                  placeholder="Ex: 12"
                  className="mt-1 w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Valor por venda (R$)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="rounded-lg bg-secondary/40 border border-border p-3">
                <p className="text-xs text-muted-foreground">Faturamento previsto</p>
                <p className="text-xl font-semibold mt-0.5 text-success">
                  {brl((Number(sales) || 0) * (Number(price) || 0))}
                </p>
              </div>
              <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90">
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold">Faturamento por dia</h3>
              <p className="text-xs text-muted-foreground">Últimos 10 dias</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Data</th>
                    <th className="text-right px-5 py-3 font-medium">Vendas</th>
                    <th className="text-right px-5 py-3 font-medium">Investido</th>
                    <th className="text-right px-5 py-3 font-medium">Faturamento</th>
                    <th className="text-right px-5 py-3 font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d) => {
                    const roi = ((d.revenue - d.spend) / d.spend) * 100;
                    return (
                      <tr key={d.date} className="border-b border-border/50">
                        <td className="px-5 py-3 font-medium">{dateBR(d.date)}</td>
                        <td className="px-5 py-3 text-right">{d.sales}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{brl(d.spend)}</td>
                        <td className="px-5 py-3 text-right text-success font-medium">{brl(d.revenue)}</td>
                        <td className="px-5 py-3 text-right">{pct(roi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
