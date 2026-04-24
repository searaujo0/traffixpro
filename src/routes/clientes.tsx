import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { brl, num, pct } from "@/lib/format";
import { Plus, ExternalLink, Loader2, KeyRound, Check, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type ClientRow } from "@/lib/data";
import { fetchAccountPerformance, fetchDashboard } from "@/lib/dashboard";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClientUser } from "@/server/admin-users";
import { updateClient, deleteClient } from "@/server/clients-manage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — TraffixPro" },
      { name: "description", content: "Gerencie todos os seus clientes em um só lugar." },
    ],
  }),
  component: ClientesPage,
});

type Row = ClientRow & { spend: number; revenue: number; roi: number; accountCount: number; lastSync: string | null; conversions: number };

function ClientesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [accessClient, setAccessClient] = useState<Row | null>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessFullName, setAccessFullName] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessSubmitting, setAccessSubmitting] = useState(false);
  const createUserFn = useServerFn(createClientUser);
  const updateClientFn = useServerFn(updateClient);
  const deleteClientFn = useServerFn(deleteClient);
  const navigate = useNavigate();

  // Edit state
  const [editClient, setEditClient] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [editSegment, setEditSegment] = useState("");
  const [editStatus, setEditStatus] = useState<"ativo" | "inativo">("ativo");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openEdit(c: Row) {
    setEditClient(c);
    setEditName(c.name);
    setEditSegment(c.segment ?? "");
    setEditStatus((c.status as "ativo" | "inativo") ?? "ativo");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editClient) return;
    setEditSubmitting(true);
    try {
      const res = await updateClientFn({
        data: {
          id: editClient.id,
          name: editName,
          segment: editSegment.trim() || null,
          status: editStatus,
        },
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Cliente atualizado");
        setEditClient(null);
        void load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteClientFn({ data: { id: deleteTarget.id } });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Cliente excluído");
        setDeleteTarget(null);
        void load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreateAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!accessClient) return;
    setAccessSubmitting(true);
    try {
      const res = await createUserFn({
        data: {
          email: accessEmail,
          password: accessPassword,
          fullName: accessFullName,
          clientId: accessClient.id,
        },
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Acesso criado e vinculado ao cliente");
        setAccessClient(null);
        setAccessEmail("");
        setAccessFullName("");
        setAccessPassword("");
        void load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar acesso");
    } finally {
      setAccessSubmitting(false);
    }
  }

  async function load() {
    setLoading(true);
    const { data: clients } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    const list = (clients ?? []) as ClientRow[];
    const enriched: Row[] = await Promise.all(
      list.map(async (c) => {
        const [dashboard, accounts] = await Promise.all([
          fetchDashboard("30d", c.id),
          fetchAccountPerformance("30d", c.id),
        ]);
        const lastSync = accounts
          .map((a) => a.last_sync_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;
        return {
          ...c,
          spend: dashboard.summary.spend,
          revenue: dashboard.summary.revenue,
          roi: dashboard.summary.roi,
          conversions: dashboard.summary.conversions,
          accountCount: accounts.length,
          lastSync,
        };
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
                    <p className="text-sm font-semibold mt-0.5 text-success">{pct(c.roi)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <span>{c.accountCount} conta{c.accountCount === 1 ? "" : "s"} vinculada{c.accountCount === 1 ? "" : "s"}</span>
                  <span className="text-right">{num(c.conversions)} leads</span>
                  <span className="col-span-2">Última sync: {c.lastSync ? new Date(c.lastSync).toLocaleString("pt-BR") : "nunca"}</span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 h-9 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition"
                  >
                    Ver relatório <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    title="Editar cliente"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    title="Excluir cliente"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  {c.owner_user_id ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-success">
                      <Check className="h-3 w-3" /> Acesso ativo
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setAccessClient(c);
                        setAccessEmail("");
                        setAccessPassword("");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <KeyRound className="h-3 w-3" /> Criar acesso
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!accessClient} onOpenChange={(o) => !o && setAccessClient(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar acesso do cliente</DialogTitle>
              <DialogDescription>
                {accessClient?.name} poderá acessar o painel com este email e senha.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAccess} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
                <Input
                  type="text"
                  value={accessFullName}
                  onChange={(e) => setAccessFullName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Senha temporária</label>
                <Input
                  type="text"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  minLength={6}
                  required
                  className="mt-1"
                />
              </div>
              <button
                type="submit"
                disabled={accessSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {accessSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar acesso
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
