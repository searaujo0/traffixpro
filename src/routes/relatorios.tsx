import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Loader2, RefreshCw, FileText, Download, CalendarIcon, Filter,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl, brlPrecise, dateBR, num, pct } from "@/lib/format";
import { fetchDashboard, type DailyPoint, type DashboardSummary } from "@/lib/dashboard";
import { generateClientReportPDF } from "@/lib/clientReportPdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — M1 Digital" },
      { name: "description", content: "Crie relatórios personalizados por cliente, período e métricas." },
    ],
  }),
  component: RelatoriosPage,
});

type Quick = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom";
type ClientLite = { id: string; name: string };

const ALL_METRICS = [
  { key: "spend", label: "Investimento", fmt: (s: DashboardSummary) => brl(s.spend) },
  { key: "revenue", label: "Faturamento", fmt: (s: DashboardSummary) => brl(s.revenue) },
  { key: "roi", label: "ROI", fmt: (s: DashboardSummary) => pct(s.roi) },
  { key: "roas", label: "ROAS", fmt: (s: DashboardSummary) => `${s.roas.toFixed(2).replace(".", ",")}x` },
  { key: "conversions", label: "Conversões / Leads", fmt: (s: DashboardSummary) => num(s.conversions) },
  { key: "cpl", label: "Custo por lead", fmt: (s: DashboardSummary) => s.cpl ? brlPrecise(s.cpl) : "—" },
  { key: "clicks", label: "Cliques", fmt: (s: DashboardSummary) => num(s.clicks) },
  { key: "ctr", label: "CTR", fmt: (s: DashboardSummary) => pct(s.ctr) },
  { key: "cpc", label: "CPC", fmt: (s: DashboardSummary) => s.cpc ? brlPrecise(s.cpc) : "—" },
  { key: "cpm", label: "CPM", fmt: (s: DashboardSummary) => s.cpm ? brlPrecise(s.cpm) : "—" },
  { key: "impressions", label: "Impressões", fmt: (s: DashboardSummary) => num(s.impressions) },
  { key: "reach", label: "Alcance", fmt: (s: DashboardSummary) => num(s.reach) },
  { key: "messages", label: "Mensagens", fmt: (s: DashboardSummary) => num(s.messages) },
  { key: "costPerMessage", label: "Custo por mensagem", fmt: (s: DashboardSummary) => s.costPerMessage ? brlPrecise(s.costPerMessage) : "—" },
  { key: "frequency", label: "Frequência", fmt: (s: DashboardSummary) => (s.frequency || 0).toFixed(2).replace(".", ",") },
] as const;

type MetricKey = typeof ALL_METRICS[number]["key"];

const DEFAULT_METRICS: MetricKey[] = ["spend", "revenue", "roi", "conversions", "cpl", "clicks", "ctr"];

function toIso(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function rangeFromQuick(q: Quick, cs?: Date, cu?: Date): { since: string; until: string } {
  const now = new Date(); const today = toIso(now);
  if (q === "today") return { since: today, until: today };
  if (q === "7d") return { since: toIso(addDays(now, -6)), until: today };
  if (q === "30d") return { since: toIso(addDays(now, -29)), until: today };
  if (q === "thisMonth") return { since: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), until: today };
  if (q === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { since: toIso(first), until: toIso(last) };
  }
  if (cs && cu) return { since: toIso(cs), until: toIso(cu) };
  return { since: today, until: today };
}

function quickLabel(q: Quick): string {
  return { today: "Hoje", "7d": "7 dias", "30d": "30 dias", thisMonth: "Este mês", lastMonth: "Mês passado", custom: "Personalizado" }[q];
}

function RelatoriosPage() {
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState<string>("all");
  const [quick, setQuick] = useState<Quick>("30d");
  const [customSince, setCustomSince] = useState<Date | undefined>();
  const [customUntil, setCustomUntil] = useState<Date | undefined>();
  const [metrics, setMetrics] = useState<MetricKey[]>(DEFAULT_METRICS);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const range = useMemo(() => rangeFromQuick(quick, customSince, customUntil), [quick, customSince, customUntil]);
  const periodLabel = `${quickLabel(quick)} (${dateBR(range.since)} a ${dateBR(range.until)})`;
  const selectedClientName = clientId === "all" ? "Todos os clientes" : (clients.find(c => c.id === clientId)?.name || "");

  useEffect(() => { void loadClients(); }, []);

  async function loadClients() {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    setClients(((data ?? []) as ClientLite[]));
  }

  async function generate() {
    setLoading(true);
    try {
      const r = await fetchDashboard({ since: range.since, until: range.until }, clientId === "all" ? undefined : clientId);
      setSummary(r.summary);
      setDaily(r.daily);
      setGenerated(true);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }

  function toggleMetric(k: MetricKey) {
    setMetrics((prev) => prev.includes(k) ? prev.filter(m => m !== k) : [...prev, k]);
  }

  function exportCSV() {
    if (!summary) return;
    const header = ["Métrica", "Valor"];
    const lines = [header.join(";")];
    for (const m of ALL_METRICS) {
      if (!metrics.includes(m.key)) continue;
      lines.push([m.label, m.fmt(summary).replace(/;/g, "")].join(";"));
    }
    lines.push("");
    lines.push(["Data", "Investimento", "Cliques", "Conversões", "Mensagens", "Vendas (R$)"].join(";"));
    for (const d of daily) {
      lines.push([d.date, d.spend.toFixed(2).replace(".", ","), d.clicks, d.conversions, d.messages, d.salesValue.toFixed(2).replace(".", ",")].join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-${selectedClientName}-${range.since}_${range.until}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    if (!summary) return;
    toast.info("Gerando PDF...");
    try {
      await generateClientReportPDF({
        client: { id: clientId, name: selectedClientName, segment: null, status: "ativo",
          contact_email: null, contact_phone: null, monthly_budget: null, owner_id: null,
          notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any,
        summary, daily, accounts: [], sales: [],
        periodLabel,
      });
      toast.success("PDF gerado");
    } catch (e) { console.error(e); toast.error("Falha ao gerar PDF"); }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monte um relatório personalizado escolhendo cliente, período e métricas.
          </p>
        </div>

        {/* Form de criação */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Criar relatório</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cliente</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="flex flex-wrap p-1 rounded-lg bg-secondary border border-border/60 text-xs">
                  {(["today", "7d", "30d", "thisMonth", "lastMonth", "custom"] as Quick[]).map((p) => (
                    <button key={p} onClick={() => setQuick(p)}
                      className={cn("px-2.5 py-1 rounded-md font-medium transition",
                        quick === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                      {quickLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
              {quick === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <DatePick value={customSince} onChange={setCustomSince} placeholder="Início" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <DatePick value={customUntil} onChange={setCustomUntil} placeholder="Fim" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Métricas a incluir</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
              {ALL_METRICS.map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md border border-border/60 hover:bg-secondary/40">
                  <Checkbox checked={metrics.includes(m.key)} onCheckedChange={() => toggleMetric(m.key)} />
                  <span className="text-xs">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Gerar relatório
            </Button>
            {generated && summary && (
              <>
                <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
                <Button variant="outline" onClick={exportPDF} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
              </>
            )}
          </div>
        </div>

        {/* Resultado */}
        {generated && summary && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs text-muted-foreground">{periodLabel} · {selectedClientName}</p>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-4">
                {ALL_METRICS.filter(m => metrics.includes(m.key)).map((m) => (
                  <div key={m.key} className="rounded-xl border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-semibold mt-1">{m.fmt(summary)}</p>
                  </div>
                ))}
              </div>
            </div>

            {daily.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
                <div className="p-5 pb-3">
                  <h3 className="text-base font-semibold">Detalhamento diário</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/40 text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-4 py-2">Data</th>
                        <th className="text-right font-medium px-4 py-2">Investimento</th>
                        <th className="text-right font-medium px-4 py-2">Cliques</th>
                        <th className="text-right font-medium px-4 py-2">Conversões</th>
                        <th className="text-right font-medium px-4 py-2">Mensagens</th>
                        <th className="text-right font-medium px-4 py-2">Vendas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map((d) => (
                        <tr key={d.date} className="border-t border-border/50">
                          <td className="px-4 py-2">{dateBR(d.date)}</td>
                          <td className="px-4 py-2 text-right">{brl(d.spend)}</td>
                          <td className="px-4 py-2 text-right">{num(d.clicks)}</td>
                          <td className="px-4 py-2 text-right">{num(d.conversions)}</td>
                          <td className="px-4 py-2 text-right">{num(d.messages)}</td>
                          <td className="px-4 py-2 text-right">{brl(d.salesValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!generated && !loading && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Configure os filtros acima e clique em "Gerar relatório".
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DatePick({ value, onChange, placeholder }: { value?: Date; onChange: (d: Date | undefined) => void; placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(value, "dd/MM/yyyy") : (placeholder || "Selecionar")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}