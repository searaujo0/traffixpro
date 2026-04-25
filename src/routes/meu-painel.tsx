import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Activity, LogOut, Loader2, Plus, RefreshCw, Settings2, Download, FileText,
  CalendarIcon, Trash2, Wallet, MousePointerClick, MessageCircle, ShoppingBag,
  TrendingUp, Eye, Target, Percent, Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { brl, brlPrecise, dateBR, num, pct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { fetchDashboard, type DailyPoint, type DashboardSummary } from "@/lib/dashboard";
import { generateClientReportPDF } from "@/lib/clientReportPdf";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meu-painel")({
  head: () => ({
    meta: [
      { title: "Meu Painel — TraffixPro" },
      { name: "description", content: "Acompanhe suas campanhas, leads e o retorno do investimento." },
    ],
  }),
  component: ClientPanel,
});

type ClientLite = { id: string; name: string };
type SaleRow = { id: string; sale_date: string; quantity: number; unit_value: number; notes: string | null };

type QuickRange = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom";

const OPTIONAL_METRICS = [
  { key: "impressions", label: "Impressões" },
  { key: "reach", label: "Alcance" },
  { key: "conversions", label: "Conversões totais (leads)" },
  { key: "cpl", label: "CPL (custo por lead)" },
  { key: "frequency", label: "Frequência" },
  { key: "roas", label: "ROAS" },
] as const;
type OptionalKey = typeof OPTIONAL_METRICS[number]["key"];

const STORAGE_KEY = "meupainel_optional_metrics_v1";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toIso(d: Date) { return d.toISOString().slice(0, 10); }

function rangeFromQuick(q: QuickRange): { since: string; until: string } {
  const now = new Date();
  const today = toIso(now);
  if (q === "today") return { since: today, until: today };
  if (q === "7d") return { since: toIso(addDays(now, -6)), until: today };
  if (q === "30d") return { since: toIso(addDays(now, -29)), until: today };
  if (q === "thisMonth") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { since: toIso(first), until: today };
  }
  if (q === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { since: toIso(first), until: toIso(last) };
  }
  return { since: today, until: today };
}

function ClientPanel() {
  const { user, profile, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState<ClientLite | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [busy, setBusy] = useState(true);

  const [quick, setQuick] = useState<QuickRange>("30d");
  const [customSince, setCustomSince] = useState<Date | undefined>();
  const [customUntil, setCustomUntil] = useState<Date | undefined>();

  const [optional, setOptional] = useState<Record<OptionalKey, boolean>>({
    impressions: true, reach: false, conversions: true, cpl: true, frequency: false, roas: true,
  });
  const [chartMetric, setChartMetric] = useState<"spend" | "clicks" | "messages" | "salesValue">("spend");

  // Sale form
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [saleQty, setSaleQty] = useState("1");
  const [saleVal, setSaleVal] = useState("");
  const [saleNotes, setSaleNotes] = useState("");

  const range = useMemo(() => {
    if (quick === "custom") {
      if (customSince && customUntil) return { since: toIso(customSince), until: toIso(customUntil) };
      return { since: todayStr(), until: todayStr() };
    }
    return rangeFromQuick(quick);
  }, [quick, customSince, customUntil]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOptional((o) => ({ ...o, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (role === "admin") { navigate({ to: "/" }); return; }
    void loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, authLoading]);

  useEffect(() => {
    if (client) { void loadMetrics(); void loadSales(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, range.since, range.until]);

  async function loadClient() {
    setBusy(true);
    const { data } = await supabase.from("clients").select("id, name").maybeSingle();
    setClient((data as ClientLite | null) ?? null);
    if (!data) setBusy(false);
  }

  async function loadMetrics() {
    if (!client) return;
    setBusy(true);
    try {
      const r = await fetchDashboard({ since: range.since, until: range.until }, client.id);
      setSummary(r.summary);
      setDaily(r.daily);
    } catch (e) { console.error(e); } finally { setBusy(false); }
  }

  async function loadSales() {
    if (!client) return;
    const { data } = await supabase
      .from("sales")
      .select("id, sale_date, quantity, unit_value, notes")
      .eq("client_id", client.id)
      .order("sale_date", { ascending: false })
      .limit(10);
    setSales((data as SaleRow[] | null) ?? []);
  }

  async function addSale(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    const quantity = parseInt(saleQty, 10);
    const unit_value = parseFloat(saleVal.replace(",", "."));
    if (!quantity || !unit_value) { toast.error("Informe quantidade e valor"); return; }
    const { error } = await supabase.from("sales").insert({
      client_id: client.id,
      quantity, unit_value,
      sale_date: toIso(saleDate),
      notes: saleNotes || null,
      created_by: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Venda registrada");
    setSaleQty("1"); setSaleVal(""); setSaleNotes(""); setSaleDate(new Date());
    void loadMetrics(); void loadSales();
  }

  async function deleteSale(id: string) {
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Venda removida");
    void loadMetrics(); void loadSales();
  }

  function toggleOptional(k: OptionalKey) {
    const next = { ...optional, [k]: !optional[k] };
    setOptional(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  async function handleLogout() { await signOut(); navigate({ to: "/auth" }); }

  async function exportPDF() {
    if (!client || !summary) { toast.error("Sem dados para exportar"); return; }
    toast.info("Gerando relatório PDF...");
    try {
      await generateClientReportPDF({
        client: {
          id: client.id,
          name: client.name,
          segment: null,
          status: "active",
          contact_email: null,
          contact_phone: null,
          monthly_budget: null,
          owner_id: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        summary,
        daily,
        accounts: [],
        sales: sales as any,
        periodLabel: formatPeriodLabel(range.since, range.until, quick),
      });
      toast.success("Relatório gerado");
    } catch (e) { console.error(e); toast.error("Falha ao gerar PDF"); }
  }

  function exportCSV() {
    const header = ["Data", "Investimento", "Cliques", "CTR", "Mensagens", "Custo/Mensagem", "Vendas (R$)", "ROI %"];
    const lines = [header.join(";")];
    for (const d of daily) {
      const ctrV = d.impressions ? (d.clicks / d.impressions) * 100 : 0;
      const cpm = d.messages ? d.spend / d.messages : 0;
      const roiV = d.spend ? ((d.salesValue - d.spend) / d.spend) * 100 : 0;
      lines.push([
        d.date,
        d.spend.toFixed(2).replace(".", ","),
        d.clicks,
        ctrV.toFixed(2).replace(".", ","),
        d.messages,
        cpm ? cpm.toFixed(2).replace(".", ",") : "",
        d.salesValue.toFixed(2).replace(".", ","),
        roiV.toFixed(1).replace(".", ","),
      ].join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${range.since}-${range.until}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading || (busy && !summary && client)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 gap-3">
        <p className="text-sm text-muted-foreground">Nenhum cliente vinculado à sua conta.</p>
        <p className="text-xs text-muted-foreground">Entre em contato com seu gestor de tráfego.</p>
        <button onClick={handleLogout} className="text-xs text-primary underline">Sair</button>
      </div>
    );
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "";
  const m = summary;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{client.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seu painel</p>
          </div>
        </div>
        <button onClick={handleLogout} className="ml-auto inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-secondary/40 text-xs font-medium hover:bg-secondary transition">
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Olá{firstName ? `, ${firstName}` : ""}!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {m?.hasData ? "Resumo das suas campanhas no período selecionado." : "Sem dados ainda neste período."}
            </p>
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap p-1 rounded-lg bg-secondary border border-border/60 text-xs">
              {([
                ["today", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"],
                ["thisMonth", "Este mês"], ["lastMonth", "Mês passado"],
              ] as Array<[QuickRange, string]>).map(([k, label]) => (
                <button key={k} onClick={() => setQuick(k)}
                  className={cn("px-3 py-1.5 rounded-md font-medium transition",
                    quick === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
              <button onClick={() => setQuick("custom")}
                className={cn("px-3 py-1.5 rounded-md font-medium transition",
                  quick === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                Personalizado
              </button>
            </div>

            {quick === "custom" && (
              <div className="flex items-center gap-2">
                <DatePick value={customSince} onChange={setCustomSince} placeholder="Início" />
                <span className="text-xs text-muted-foreground">até</span>
                <DatePick value={customUntil} onChange={setCustomUntil} placeholder="Fim" />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" /> Métricas
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60">
                  <p className="text-xs font-semibold mb-2">Métricas extras</p>
                  <div className="space-y-2">
                    {OPTIONAL_METRICS.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={optional[opt.key]} onCheckedChange={() => toggleOptional(opt.key)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportPDF}>
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <button onClick={loadMetrics} disabled={busy}
                className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary disabled:opacity-50" title="Atualizar">
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          {/* Main KPIs */}
          <section className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            <Kpi icon={Wallet} label="Valor investido" value={brl(m?.spend ?? 0)} />
            <Kpi icon={Eye} label="CPM" value={m?.cpm ? brlPrecise(m.cpm) : "—"} />
            <Kpi icon={MousePointerClick} label="Cliques" value={num(m?.clicks ?? 0)} />
            <Kpi icon={MousePointerClick} label="CPC" value={m?.cpc ? brlPrecise(m.cpc) : "—"} />
            <Kpi icon={Percent} label="CTR" value={pct(m?.ctr ?? 0)} />
            <Kpi icon={MessageCircle} label="Mensagens (WhatsApp)" value={num(m?.messages ?? 0)} />
            <Kpi icon={MessageCircle} label="Custo por mensagem" value={m?.costPerMessage ? brlPrecise(m.costPerMessage) : "—"} />
            <Kpi icon={ShoppingBag} label="Vendas (R$)" value={brl(m?.revenue ?? 0)} hint={`${m?.salesCount ?? 0} unidade(s)`} />
            <Kpi icon={TrendingUp} label="ROI" value={pct(m?.roi ?? 0)} highlight tone={(m?.roi ?? 0) >= 0 ? "success" : "destructive"} />
          </section>

          {/* Optional metrics */}
          {Object.values(optional).some(Boolean) && (
            <section className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {optional.impressions && <Kpi small icon={Eye} label="Impressões" value={num(m?.impressions ?? 0)} />}
              {optional.reach && <Kpi small icon={Users} label="Alcance" value={num(m?.reach ?? 0)} />}
              {optional.conversions && <Kpi small icon={Target} label="Leads" value={num(m?.conversions ?? 0)} />}
              {optional.cpl && <Kpi small icon={Target} label="CPL" value={m?.cpl ? brlPrecise(m.cpl) : "—"} />}
              {optional.frequency && <Kpi small icon={Activity} label="Frequência" value={(m?.frequency ?? 0).toFixed(2).replace(".", ",")} />}
              {optional.roas && <Kpi small icon={TrendingUp} label="ROAS" value={`${(m?.roas ?? 0).toFixed(2).replace(".", ",")}x`} />}
            </section>
          )}

          {/* Chart */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold">Desempenho diário</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{range.since} a {range.until}</p>
              </div>
              <div className="flex p-1 rounded-lg bg-secondary border border-border/60 text-xs">
                {([
                  ["spend", "Investimento"], ["clicks", "Cliques"],
                  ["messages", "Mensagens"], ["salesValue", "Vendas"],
                ] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setChartMetric(k)}
                    className={cn("px-2.5 py-1 rounded-md font-medium transition",
                      chartMetric === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período selecionado.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily.map((d) => ({ ...d, dateLabel: dateBR(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                    <XAxis dataKey="dateLabel" stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8a94a6" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#161b22", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey={chartMetric} stroke="#6366f1" fill="rgba(99, 102, 241, 0.18)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Daily table */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="p-5 pb-3">
              <h2 className="text-base font-semibold">Tabela diária</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Cada linha é um dia do período.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Data</th>
                    <th className="text-right font-medium px-4 py-2">Invest.</th>
                    <th className="text-right font-medium px-4 py-2">Cliques</th>
                    <th className="text-right font-medium px-4 py-2">CTR</th>
                    <th className="text-right font-medium px-4 py-2">Msgs</th>
                    <th className="text-right font-medium px-4 py-2">Custo/Msg</th>
                    <th className="text-right font-medium px-4 py-2">Vendas</th>
                    <th className="text-right font-medium px-4 py-2">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Sem dados.</td></tr>
                  ) : daily.map((d) => {
                    const ctrV = d.impressions ? (d.clicks / d.impressions) * 100 : 0;
                    const cpmV = d.messages ? d.spend / d.messages : 0;
                    const roiV = d.spend ? ((d.salesValue - d.spend) / d.spend) * 100 : 0;
                    return (
                      <tr key={d.date} className="border-t border-border/50">
                        <td className="px-4 py-2">{dateBR(d.date)}</td>
                        <td className="px-4 py-2 text-right">{brl(d.spend)}</td>
                        <td className="px-4 py-2 text-right">{num(d.clicks)}</td>
                        <td className="px-4 py-2 text-right">{pct(ctrV)}</td>
                        <td className="px-4 py-2 text-right">{num(d.messages)}</td>
                        <td className="px-4 py-2 text-right">{cpmV ? brlPrecise(cpmV) : "—"}</td>
                        <td className="px-4 py-2 text-right">{brl(d.salesValue)}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", d.spend ? (roiV >= 0 ? "text-success" : "text-destructive") : "text-muted-foreground")}>
                          {d.spend ? pct(roiV) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sales */}
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={addSale} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold mb-1">Registrar nova venda</h2>
            <p className="text-xs text-muted-foreground mb-4">Mantenha o ROI sempre fiel ao que está acontecendo.</p>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data</label>
                  <DatePick value={saleDate} onChange={(d) => d && setSaleDate(d)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
                  <Input type="number" min="1" value={saleQty} onChange={(e) => setSaleQty(e.target.value)} required className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Valor unitário (R$)</label>
                <Input type="number" min="0" step="0.01" value={saleVal} onChange={(e) => setSaleVal(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Observação (opcional)</label>
                <Input value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} className="mt-1" />
              </div>
              <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> Adicionar venda</Button>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold mb-1">Últimas vendas</h2>
            <p className="text-xs text-muted-foreground mb-4">10 vendas mais recentes.</p>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma venda registrada.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {sales.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{brl(s.quantity * Number(s.unit_value))}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateBR(s.sale_date)} · {s.quantity}x {brlPrecise(Number(s.unit_value))}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </p>
                    </div>
                    <button onClick={() => deleteSale(s.id)} className="h-8 w-8 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, small, highlight, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  small?: boolean; highlight?: boolean;
  tone?: "success" | "destructive";
}) {
  const toneCls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]",
      highlight ? "border-primary/40 bg-[image:var(--gradient-primary)]/5" : "border-border",
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={cn("font-semibold mt-1", small ? "text-base" : "text-xl md:text-2xl", toneCls)}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function DatePick({ value, onChange, placeholder }: { value?: Date; onChange: (d: Date | undefined) => void; placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal mt-1", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(value, "dd/MM/yyyy") : (placeholder || "Selecionar")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}
