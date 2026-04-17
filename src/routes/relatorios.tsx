import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { SmartChart } from "@/components/SmartChart";
import { dailyMetrics } from "@/lib/mock-data";
import { brl, brlPrecise, dateBR, num } from "@/lib/format";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — TraffixPro" },
      { name: "description", content: "Relatórios diários e mensais detalhados das campanhas." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const recent = [...dailyMetrics].reverse().slice(0, 14);
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico diário e comparações de desempenho.
          </p>
        </div>

        <SmartChart />

        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold">Histórico diário</h3>
            <p className="text-xs text-muted-foreground">Últimos 14 dias</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Data</th>
                  <th className="text-right px-5 py-3 font-medium">Investido</th>
                  <th className="text-right px-5 py-3 font-medium">Conversas</th>
                  <th className="text-right px-5 py-3 font-medium">Custo / conv.</th>
                  <th className="text-right px-5 py-3 font-medium">Cliques</th>
                  <th className="text-right px-5 py-3 font-medium">Vendas</th>
                  <th className="text-right px-5 py-3 font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr
                    key={d.date}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-[var(--transition-smooth)]"
                  >
                    <td className="px-5 py-3 font-medium">{dateBR(d.date)}</td>
                    <td className="px-5 py-3 text-right">{brl(d.spend)}</td>
                    <td className="px-5 py-3 text-right">{num(d.conversations)}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {brlPrecise(d.spend / d.conversations)}
                    </td>
                    <td className="px-5 py-3 text-right">{num(d.clicks)}</td>
                    <td className="px-5 py-3 text-right">{d.sales}</td>
                    <td className="px-5 py-3 text-right text-success font-medium">
                      {brl(d.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
