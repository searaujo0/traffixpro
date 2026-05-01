import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Wallet, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertClientPayment, deleteClientPayment } from "@/server/payments-manage";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — M1 Digital" },
      { name: "description", content: "Mensalidades e faturamento dos clientes." },
    ],
  }),
  component: FinanceiroPage,
});

type ClientLite = { id: string; name: string; contract_value: number | null };
type PaymentRow = {
  id: string;
  client_id: string;
  reference_year: number;
  reference_month: number;
  amount: number;
  payment_date: string;
  status: "pago" | "pendente" | "atrasado";
  notes: string | null;
};

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function FinanceiroPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  // form
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today.toISOString().slice(0,10));
  const [status, setStatus] = useState<"pago" | "pendente" | "atrasado">("pago");
  const [notes, setNotes] = useState("");

  useEffect(() => { void load(); }, [year, month]);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("clients").select("id, name, contract_value").order("name"),
      supabase.from("client_payments").select("*").eq("reference_year", year).eq("reference_month", month),
    ]);
    setClients(((c.data ?? []) as ClientLite[]));
    setPayments(((p.data ?? []) as PaymentRow[]));
    setLoading(false);
  }

  function paymentFor(clientId: string) {
    return payments.find((p) => p.client_id === clientId) ?? null;
  }

  function openFor(clientId: string) {
    const p = paymentFor(clientId);
    const c = clients.find((x) => x.id === clientId);
    setAmount(p ? String(p.amount) : (c?.contract_value ? String(c.contract_value) : ""));
    setPaymentDate(p?.payment_date ?? today.toISOString().slice(0,10));
    setStatus(p?.status ?? "pago");
    setNotes(p?.notes ?? "");
    setOpenDialog(clientId);
  }

  async function save() {
    if (!openDialog) return;
    const existing = paymentFor(openDialog);
    const r = await upsertClientPayment({
      data: {
        id: existing?.id,
        client_id: openDialog,
        reference_year: year,
        reference_month: month,
        amount: parseFloat(amount.replace(",", ".")) || 0,
        payment_date: paymentDate,
        status,
        notes: notes || null,
      },
    });
    if (!r.ok) { toast.error(r.error ?? "Erro"); return; }
    toast.success("Pagamento salvo");
    setOpenDialog(null);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este pagamento?")) return;
    const r = await deleteClientPayment({ data: { id } });
    if (!r.ok) { toast.error(r.error ?? "Erro"); return; }
    toast.success("Pagamento excluído");
    void load();
  }

  const totals = useMemo(() => {
    const pago = payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
    const pendente = payments.filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.amount), 0);
    const atrasado = payments.filter((p) => p.status === "atrasado").reduce((s, p) => s + Number(p.amount), 0);
    return { pago, pendente, atrasado };
  }, [payments]);

  const years = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-1">Controle de mensalidades por cliente.</p>
          </div>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((n, i) => (<SelectItem key={i} value={String(i+1)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiBox icon={CheckCircle2} label="Recebido" value={brl(totals.pago)} tone="success" />
          <KpiBox icon={Clock} label="Pendente" value={brl(totals.pendente)} tone="warning" />
          <KpiBox icon={AlertTriangle} label="Atrasado" value={brl(totals.atrasado)} tone="destructive" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Cliente</th>
                  <th className="text-right font-medium px-4 py-2.5">Valor contrato</th>
                  <th className="text-right font-medium px-4 py-2.5">Pago</th>
                  <th className="text-left font-medium px-4 py-2.5">Status</th>
                  <th className="text-right font-medium px-4 py-2.5">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const p = paymentFor(c.id);
                  return (
                    <tr key={c.id} className="border-t border-border/50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-right">{c.contract_value ? brl(Number(c.contract_value)) : "—"}</td>
                      <td className="px-4 py-3 text-right">{p ? brl(Number(p.amount)) : "—"}</td>
                      <td className="px-4 py-3">
                        {p ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            p.status === "pago" ? "bg-success/15 text-success"
                            : p.status === "pendente" ? "bg-warning/15 text-warning"
                            : "bg-destructive/15 text-destructive"
                          }`}>{p.status}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">não registrado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => openFor(c.id)}>
                          {p ? "Editar" : <><Plus className="h-3.5 w-3.5 mr-1" /> Registrar</>}
                        </Button>
                        {p && (
                          <Button size="sm" variant="ghost" className="ml-2 text-destructive" onClick={() => remove(p.id)}>Excluir</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {clients.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhum cliente cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!openDialog} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento — {MONTH_NAMES[month-1]}/{year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data do pagamento</label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v: "pago" | "pendente" | "atrasado") => setStatus(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observação</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function KpiBox({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "success" | "warning" | "destructive" }) {
  const toneCls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneCls}`} />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</p>
    </div>
  );
}
