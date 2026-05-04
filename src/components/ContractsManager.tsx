import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Pencil, Trash2, FileSignature, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createContract, updateContract, deleteContract, listContractsByClient, type Contract,
} from "@/server/contracts-manage";
import { Money } from "@/components/Money";
import { usePermissions } from "@/hooks/usePermissions";

function daysUntil(dateIso: string | null) {
  if (!dateIso) return null;
  const d = new Date(dateIso + "T00:00:00").getTime();
  const now = new Date(new Date().toDateString()).getTime();
  return Math.round((d - now) / 86400000);
}

const emptyForm = {
  monthly_value: 0,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "" as string,
  is_indeterminate: true,
  payment_day: "" as string,
  status: "ativo" as Contract["status"],
  notes: "" as string,
};

export function ContractsManager({ clientId }: { clientId: string }) {
  const { canManageContracts } = usePermissions();
  const callList = useServerFn(listContractsByClient);
  const callCreate = useServerFn(createContract);
  const callUpdate = useServerFn(updateContract);
  const callDelete = useServerFn(deleteContract);

  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [delTarget, setDelTarget] = useState<Contract | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await callList({ data: { clientId } });
      if (res.error) toast.error(res.error);
      setRows(res.contracts ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [clientId]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }
  function openEdit(c: Contract) {
    setEditing(c);
    setForm({
      monthly_value: Number(c.monthly_value),
      start_date: c.start_date,
      end_date: c.end_date ?? "",
      is_indeterminate: c.is_indeterminate,
      payment_day: c.payment_day ? String(c.payment_day) : "",
      status: c.status,
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      client_id: clientId,
      monthly_value: Number(form.monthly_value) || 0,
      start_date: form.start_date,
      end_date: form.is_indeterminate ? null : (form.end_date || null),
      is_indeterminate: form.is_indeterminate,
      payment_day: form.payment_day ? Number(form.payment_day) : null,
      status: form.status,
      notes: form.notes || null,
    };
    const res = editing
      ? await callUpdate({ data: { id: editing.id, ...payload } })
      : await callCreate({ data: payload });
    setSubmitting(false);
    if (!res.ok) toast.error(res.error ?? "Erro");
    else {
      toast.success(editing ? "Contrato atualizado" : "Contrato criado");
      setDialogOpen(false);
      void load();
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    const res = await callDelete({ data: { id: delTarget.id } });
    if (!res.ok) toast.error(res.error ?? "Erro");
    else {
      toast.success("Contrato removido");
      setDelTarget(null);
      void load();
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Contratos</h3>
        </div>
        {canManageContracts && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Novo contrato
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhum contrato cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Valor mensal</th>
                <th className="py-2 pr-3">Início</th>
                <th className="py-2 pr-3">Fim</th>
                <th className="py-2 pr-3">Pgto</th>
                <th className="py-2 pr-3">Status</th>
                {canManageContracts && <th className="py-2 pr-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const d = daysUntil(c.end_date);
                const expiring = c.status === "ativo" && !c.is_indeterminate && d !== null && d <= 30 && d >= 0;
                return (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 font-medium"><Money value={c.monthly_value} precise /></td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{new Date(c.start_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="py-2.5 pr-3">
                      {c.is_indeterminate ? (
                        <span className="text-xs text-muted-foreground">Indeterminado</span>
                      ) : c.end_date ? (
                        <span className={expiring ? "text-amber-500 font-medium" : "text-muted-foreground"}>
                          {new Date(c.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          {expiring && <span className="ml-1 text-[10px]"><AlertTriangle className="inline h-3 w-3" /> {d}d</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{c.payment_day ? `Dia ${c.payment_day}` : "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        c.status === "ativo" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : c.status === "suspenso" ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border"
                      }`}>{c.status}</span>
                    </td>
                    {canManageContracts && (
                      <td className="py-2.5 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded border border-border hover:bg-secondary">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDelTarget(c)} className="p-1.5 rounded border border-border text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contrato" : "Novo contrato"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do contrato." : "Apenas um contrato pode estar ativo por vez. Ao criar um novo ativo, os anteriores serão encerrados."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Valor mensal (R$)</label>
                <Input type="number" step="0.01" min="0" value={form.monthly_value}
                  onChange={(e) => setForm({ ...form, monthly_value: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dia do pagamento</label>
                <Input type="number" min="1" max="31" value={form.payment_day}
                  onChange={(e) => setForm({ ...form, payment_day: e.target.value })} placeholder="Ex: 10" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data de início</label>
              <Input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_indeterminate}
                onChange={(e) => setForm({ ...form, is_indeterminate: e.target.checked })} />
              Contrato por tempo indeterminado
            </label>
            {!form.is_indeterminate && (
              <div>
                <label className="text-xs text-muted-foreground">Data de fim</label>
                <Input type="date" value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Contract["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar contrato"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contrato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
