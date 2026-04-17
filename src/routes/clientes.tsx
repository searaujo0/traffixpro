import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { brl } from "@/lib/format";
import { Plus, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aggregate, fetchCampaigns, fetchSales, type ClientRow } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — TraffixPro" },
      { name: "description", content: "Gerencie todos os seus clientes em um só lugar." },
    ],
  }),
  component: ClientesPage,
});

type Row = ClientRow & { spend: number; revenue: number; roi: number };

function ClientesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: clients } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    const list = (clients ?? []) as ClientRow[];
    const enriched: Row[] = await Promise.all(
      list.map(async (c) => {
        const [camps, sls] = await Promise.all([fetchCampaigns(c.id), fetchSales(c.id)]);
        const m = aggregate(camps, sls);
        return { ...c, spend: m.spend, revenue: m.revenue, roi: m.roi };
      })
    );
    setRows(enriched);
    setLoading(false);
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    let owner_user_id: string | null = null;
    if (ownerEmail) {
      // tenta achar user pelo email via user_roles? Não temos profiles. Deixar null por enquanto.
      // Admin atribuirá depois via SQL ou interface dedicada.
    }
    const { error } = await supabase.from("clients").insert({
      name,
      segment: segment || null,
      owner_user_id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cliente criado");
      setName("");
      setSegment("");
      setOwnerEmail("");
      setShowForm(false);
      void load();
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length} cliente{rows.length === 1 ? "" : "s"} cadastrado{rows.length === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={createClient}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Segmento</label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} className="mt-1" />
            </div>
            <button
              type="submit"
              className="self-end inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              Salvar
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em "Novo cliente" para começar.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground font-semibold">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.segment ?? "—"}</p>
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
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Investido</p>
                    <p className="text-sm font-semibold mt-0.5">{brl(c.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturado</p>
                    <p className="text-sm font-semibold mt-0.5">{brl(c.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI</p>
                    <p className="text-sm font-semibold mt-0.5 text-success">{c.roi.toFixed(0)}%</p>
                  </div>
                </div>

                <Link
                  to="/clientes/$id"
                  params={{ id: c.id }}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 text-xs font-medium text-primary hover:underline"
                >
                  Ver relatório <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
