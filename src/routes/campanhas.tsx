import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { brl, brlPrecise, num, pct } from "@/lib/format";
import { fetchAccountPerformance, type AccountPerformance, type Period } from "@/lib/dashboard";
import { META_METRIC_LABELS } from "@/lib/metaLabels";

export const Route = createFileRoute("/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — M1 Digital" },
      { name: "description", content: "Suas contas de anúncio sincronizadas via Meta Ads." },
    ],
  }),
  component: CampanhasPage,
});

type Row = AccountPerformance;

const periodLabels: Record<Period, string> = { today: "Hoje", "7d": "7 dias", "30d": "30 dias" };

function CampanhasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    void load();
  }, [period]);

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchAccountPerformance(period));
    } finally {
      setLoading(false);
    }
    return;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Contas de anúncio</h1>
            <p className="text-sm text-muted-foreground mt-1">{rows.length} conta{rows.length === 1 ? "" : "s"} importada{rows.length === 1 ? "" : "s"} · {periodLabels[period]}</p>
          </div>
          <div className="flex p-1 rounded-lg bg-secondary border border-border/60 text-xs">
            {(["today", "7d", "30d"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md font-medium transition ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
Nenhuma conta importada. Vá em Meta Ads para conectar o Facebook e importar contas reais.
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.id} · {r.currency ?? "—"} · {r.business_name ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {r.client_id ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> vinculada</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><AlertCircle className="h-3 w-3" /> sem cliente</span>}
                    <span className="text-muted-foreground">Última sync: {r.last_sync_at ? new Date(r.last_sync_at).toLocaleString("pt-BR") : "nunca"}</span>
                    {r.last_sync_error && <span className="text-destructive">{r.last_sync_error}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{META_METRIC_LABELS.spend}</p>
                    <p className="font-semibold">{brl(r.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{META_METRIC_LABELS.results}</p>
                    <p className="font-semibold">{num(r.conversions)}</p>
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5">{r.resultLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{META_METRIC_LABELS.costPerResult}</p>
                    <p className="font-semibold">{r.cpl ? brlPrecise(r.cpl) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">CTR</p>
                    <p className="font-semibold">{pct(r.ctr)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">{META_METRIC_LABELS.linkClicks}</p>
                    <p className="font-semibold">{num(r.clicks)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
