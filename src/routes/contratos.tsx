import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { listAllContracts, type Contract } from "@/server/contracts-manage";
import { Money } from "@/components/Money";
import { Loader2, FileSignature, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos — M1 Digital" },
      { name: "description", content: "Gestão dos contratos dos clientes." },
    ],
  }),
  component: ContratosPage,
});

type Row = Contract & { client_name: string };

function statusBadge(s: Row["status"]) {
  const map = {
    ativo: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    encerrado: "bg-muted text-muted-foreground border-border",
    suspenso: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  } as const;
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${map[s]}`}>
      {s}
    </span>
  );
}

function daysUntil(dateIso: string | null) {
  if (!dateIso) return null;
  const d = new Date(dateIso + "T00:00:00").getTime();
  const now = new Date(new Date().toDateString()).getTime();
  return Math.round((d - now) / 86400000);
}

function ContratosPage() {
  const callList = useServerFn(listAllContracts);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"vigentes" | "expirando" | "encerrados" | "todos">("vigentes");

  async function load() {
    setLoading(true);
    try {
      const res = await callList();
      if (res.error) toast.error(res.error);
      setRows((res.contracts ?? []) as Row[]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const filtered = rows
    .filter((r) => r.client_name.toLowerCase().includes(filter.toLowerCase()))
    .filter((r) => {
      if (tab === "todos") return true;
      if (tab === "vigentes") return r.status === "ativo";
      if (tab === "encerrados") return r.status === "encerrado";
      if (tab === "expirando") {
        if (r.status !== "ativo" || r.is_indeterminate) return false;
        const d = daysUntil(r.end_date);
        return d !== null && d <= 30 && d >= 0;
      }
      return true;
    });

  return (
    <AppLayout allow={["admin", "financeiro"]}>
      <div className="flex items-center gap-3 mb-6">
        <FileSignature className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe vigências e renovações dos clientes.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["vigentes","expirando","encerrados","todos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "vigentes" ? "Vigentes" : t === "expirando" ? "Expirando em 30 dias" : t === "encerrados" ? "Encerrados" : "Todos"}
          </button>
        ))}
        <Input
          placeholder="Buscar cliente…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">Nenhum contrato.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Valor mensal</th>
                  <th className="text-left px-4 py-3 font-medium">Início</th>
                  <th className="text-left px-4 py-3 font-medium">Fim</th>
                  <th className="text-left px-4 py-3 font-medium">Pgto</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const d = daysUntil(r.end_date);
                  const expiring = r.status === "ativo" && !r.is_indeterminate && d !== null && d <= 30 && d >= 0;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <Link to="/clientes/$id" params={{ id: r.client_id }} className="font-medium hover:text-primary">
                          {r.client_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Money value={r.monthly_value} precise /></td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        {r.is_indeterminate ? (
                          <span className="text-xs text-muted-foreground">Indeterminado</span>
                        ) : r.end_date ? (
                          <span className={expiring ? "text-amber-500 font-medium" : "text-muted-foreground"}>
                            {new Date(r.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                            {expiring && (
                              <span className="ml-1 inline-flex items-center gap-1 text-[10px]">
                                <AlertTriangle className="h-3 w-3" /> {d}d
                              </span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.payment_day ? `Dia ${r.payment_day}` : "—"}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
