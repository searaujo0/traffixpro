import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, LogOut, Loader2, TrendingUp, Wallet, ShoppingBag, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { brl, pct } from "@/lib/format";
import { aggregate, type CampaignRow, type ClientRow, type SaleRow } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/meu-painel")({
  head: () => ({
    meta: [
      { title: "Meu Painel — TraffixPro" },
      { name: "description", content: "Acompanhe suas vendas e o retorno das suas campanhas." },
    ],
  }),
  component: ClientPanel,
});

function ClientPanel() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [qty, setQty] = useState("");
  const [val, setVal] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (role === "admin") {
      navigate({ to: "/" });
      return;
    }
    void load();
  }, [user, role, loading]);

  async function load() {
    setBusy(true);
    const { data: cli } = await supabase.from("clients").select("*").maybeSingle();
    if (cli) {
      setClient(cli as ClientRow);
      const [{ data: camps }, { data: sls }] = await Promise.all([
        supabase.from("campaigns").select("*").eq("client_id", cli.id),
        supabase.from("sales").select("*").eq("client_id", cli.id).order("sale_date", { ascending: false }),
      ]);
      setCampaigns((camps ?? []) as CampaignRow[]);
      setSales((sls ?? []) as SaleRow[]);
    }
    setBusy(false);
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
      void load();
    }
  }

  async function handleLogout() {
    await signOut();
    navigate({ to: "/auth" });
  }

  if (loading || busy) {
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

  const m = aggregate(campaigns, sales);

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

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Olá!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aqui está o resumo das suas vendas e o retorno do investimento.
          </p>
        </div>

        {/* 3 KPIs essenciais */}
        <div className="grid gap-4 sm:grid-cols-3">
          <BigKpi
            icon={Wallet}
            label="Faturamento"
            value={brl(m.revenue)}
            tone="primary"
          />
          <BigKpi
            icon={TrendingUp}
            label="ROI"
            value={pct(m.roi)}
            tone="success"
          />
          <BigKpi
            icon={ShoppingBag}
            label="Vendas"
            value={String(m.sales)}
            tone="accent"
          />
        </div>

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

        {/* Histórico simples */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold mb-4">Últimas vendas</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sales.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {s.quantity} × {brl(Number(s.unit_value))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(s.sale_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-success">
                    {brl(s.quantity * Number(s.unit_value))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
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
