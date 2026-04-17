import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { clients } from "@/lib/mock-data";
import { brl } from "@/lib/format";
import { Plus, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — TraffixPro" },
      { name: "description", content: "Gerencie todos os seus clientes em um só lugar." },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {clients.length} clientes cadastrados.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition-[var(--transition-smooth)]">
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => {
            const roi = ((c.revenue - c.spend) / c.spend) * 100;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition-[var(--transition-smooth)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground font-semibold">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.segment}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase ${
                      c.status === "ativo"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Investido
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{brl(c.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Faturado
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{brl(c.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      ROI
                    </p>
                    <p className="text-sm font-semibold mt-0.5 text-success">
                      {roi.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <button className="mt-4 w-full inline-flex items-center justify-center gap-2 text-xs font-medium text-primary hover:underline">
                  Ver relatório <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
