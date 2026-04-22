import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  LogOut,
  Loader2,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Plus,
  Eye,
  MousePointerClick,
  Target,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { brl, brlPrecise, num, pct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  fetchDashboard,
  type DashboardSummary,
  type Period,
} from "@/lib/dashboard";

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

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
};

function ClientPanel() {
  const { user, profile, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientLite | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [busy, setBusy] = useState(true);
  const [qty, setQty] = useState("");
  const [val, setVal] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (role === "admin") {
      navigate({ to: "/" });
      return;
    }
    void loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, authLoading]);

  useEffect(() => {
    if (client) void loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, period]);

  async function loadClient() {
    setBusy(true);
    const { data: cli } = await supabase
      .from("clients")
      .select("id, name")
      .maybeSingle();
    setClient((cli as ClientLite | null) ?? null);
    if (!cli) setBusy(false);
  }

  async function loadMetrics() {
    if (!client) return;
    setBusy(true);
    try {
      const r = await fetchDashboard(period, client.id);
      setSummary(r.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function addSale(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    const quantity = parseInt(qty, 10);
    const unit_value = parseFloat(val);
    if (!quantity || !unit_value) return;
    const { error } = await supabase.from("sales").insert({
      client_id: client.id,
      quantity,
      unit_value,
      created_by: user!.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Venda registrada");
      setQty("");
      setVal("");
      void loadMetrics();
    }
  }

  async function handleLogout() {
    await signOut();
    navigate({ to: "/auth" });
  }

  if (authLoading || (busy && !summary && client)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
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
        <button
          onClick={handleLogout}
          className="ml-auto inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-secondary/40 text-xs font-medium hover:bg-secondary transition"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">
              Olá{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {m?.hasData
                ? "Aqui está o resumo das suas campanhas e vendas."
                : "Ainda não há dados — aguarde o gestor sincronizar suas campanhas."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex p-1 rounded-lg bg-secondary border border-border/60">
              {(["today", "7d", "30d"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <button
              onClick={loadMetrics}
              disabled={busy}
              className="h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <BigKpi icon={Wallet} label="Faturamento" value={brl(m?.revenue ?? 0)} tone="primary" />
          <BigKpi icon={TrendingUp} label="ROI" value={pct(m?.roi ?? 0)} tone="success" />
          <BigKpi icon={ShoppingBag} label="Vendas" value={String(m?.salesCount ?? 0)} tone="accent" />
        </div>

        {/* Meta Ads KPIs */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Campanhas — Meta Ads
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SmallKpi label="Investimento" value={brl(m?.spend ?? 0)} />
            <SmallKpi label="Leads" value={num(m?.conversions ?? 0)} hint={m?.cpl ? `CPL ${brlPrecise(m.cpl)}` : undefined} />
            <SmallKpi label="Cliques" value={num(m?.clicks ?? 0)} hint={`CTR ${pct(m?.ctr ?? 0)}`} />
            <SmallKpi label="Impressões" value={num(m?.impressions ?? 0)} hint={m?.cpm ? `CPM ${brlPrecise(m.cpm)}` : undefined} />
            <SmallKpi label="ROAS" value={`${(m?.roas ?? 0).toFixed(2).replace(".", ",")}x`} />
            <SmallKpi label="CPC" value={m?.cpc ? brlPrecise(m.cpc) : "—"} />
            <SmallKpi label="Custo por venda" value={m?.salesCount ? brlPrecise((m?.spend ?? 0) / m.salesCount) : "—"} />
            <SmallKpi label="Alcance" value={num(m?.reach ?? 0)} />
          </div>
        </section>

        {/* Adicionar venda */}
        <form onSubmit={addSale} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold mb-1">Registrar nova venda</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Mantenha seus números atualizados para acompanhar o ROI real.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor unitário (R$)</label>
              <Input type="number" min="0" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} required className="mt-1" />
            </div>
            <button
              type="submit"
              className="self-end inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function BigKpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success" | "accent";
}) {
  const toneCls =
    tone === "success"
      ? "text-success bg-success/10"
      : tone === "accent"
      ? "text-accent bg-accent/10"
      : "text-primary bg-primary/10";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-3">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function SmallKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// Avoid unused import warnings for icons not in lite UI
void Eye; void MousePointerClick; void Target;
