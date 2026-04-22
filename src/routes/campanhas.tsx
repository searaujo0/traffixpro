import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl, num } from "@/lib/format";

export const Route = createFileRoute("/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — TraffixPro" },
      { name: "description", content: "Suas contas de anúncio sincronizadas via Meta Ads." },
    ],
  }),
  component: CampanhasPage,
});

type Row = {
  id: string;
  name: string;
  currency: string | null;
  status: string | null;
  business_name: string | null;
  client_id: string | null;
  spend: number;
  conversions: number;
  clicks: number;
};

function CampanhasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: accs } = await supabase
      .from("ad_accounts")
      .select("id, name, currency, status, business_name, client_id");
    const list = (accs ?? []) as unknown as Omit<Row, "spend" | "conversions" | "clicks">[];
    const enriched: Row[] = await Promise.all(
      list.map(async (a) => {
        const { data: ins } = await supabase
          .from("ad_insights")
          .select("spend, conversions, clicks")
          .eq("ad_account_id", a.id);
        let spend = 0, conversions = 0, clicks = 0;
        for (const r of (ins ?? []) as { spend: number; conversions: number; clicks: number }[]) {
          spend += Number(r.spend);
          conversions += Number(r.conversions);
          clicks += Number(r.clicks);
        }
        return { ...a, spend, conversions, clicks };
      }),
    );
    setRows(enriched);
    setLoading(false);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Contas de anúncio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} conta{rows.length === 1 ? "" : "s"} sincronizada{rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhuma conta importada. Vá em Meta Ads para conectar e importar.
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.id} · {r.currency ?? "—"} · {r.business_name ?? "—"}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Investimento</p>
                    <p className="font-semibold">{brl(r.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Leads</p>
                    <p className="font-semibold">{num(r.conversions)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Cliques</p>
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
