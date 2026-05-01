import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — M1 Digital" },
      { name: "description", content: "Vendas registradas pelos clientes." },
    ],
  }),
  component: FinanceiroPage,
});

type SaleRow = {
  id: string;
  client_id: string;
  quantity: number;
  unit_value: number;
  sale_date: string;
};

function FinanceiroPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("sales")
        .select("id, client_id, quantity, unit_value, sale_date")
        .order("sale_date", { ascending: false })
        .limit(100);
      setRows((data ?? []) as SaleRow[]);
      setLoading(false);
    })();
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.quantity) * Number(r.unit_value), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faturamento total: <span className="text-foreground font-medium">{brl(total)}</span>
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhuma venda registrada ainda.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{r.quantity} × {brl(Number(r.unit_value))}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.sale_date).toLocaleDateString("pt-BR")}</p>
                </div>
                <p className="text-sm font-semibold text-success">
                  {brl(r.quantity * Number(r.unit_value))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
