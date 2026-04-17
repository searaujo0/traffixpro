import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { campaigns } from "@/lib/mock-data";
import { brl, num, pct } from "@/lib/format";

export const Route = createFileRoute("/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — TraffixPro" },
      { name: "description", content: "Acompanhe o desempenho das campanhas ativas." },
    ],
  }),
  component: CampanhasPage,
});

function CampanhasPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral de todas as campanhas em execução.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Campanha</th>
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Investido</th>
                  <th className="text-right px-5 py-3 font-medium">Conversas</th>
                  <th className="text-right px-5 py-3 font-medium">CTR</th>
                  <th className="text-right px-5 py-3 font-medium">Custo / conv.</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-[var(--transition-smooth)]"
                  >
                    <td className="px-5 py-4 font-medium">{c.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{c.client}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase ${
                          c.status === "ativa"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">{brl(c.spend)}</td>
                    <td className="px-5 py-4 text-right">{num(c.conv)}</td>
                    <td className="px-5 py-4 text-right">{pct(c.ctr)}</td>
                    <td className="px-5 py-4 text-right text-muted-foreground">
                      {brl(c.spend / c.conv)}
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
