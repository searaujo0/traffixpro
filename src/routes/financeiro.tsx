import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, FileSignature, Receipt } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MensalidadesTab } from "@/components/financeiro/MensalidadesTab";
import { ContratosTab } from "@/components/financeiro/ContratosTab";
import { ComissoesTab } from "@/components/financeiro/ComissoesTab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — TraffixPro" },
      { name: "description", content: "Centro financeiro: mensalidades, contratos e comissões." },
    ],
  }),
  component: FinanceiroPage,
});

type Tab = "mensalidades" | "contratos" | "comissoes";

const TABS: { key: Tab; label: string; icon: typeof Wallet }[] = [
  { key: "mensalidades", label: "Mensalidades", icon: Wallet },
  { key: "contratos", label: "Contratos", icon: FileSignature },
  { key: "comissoes", label: "Comissões", icon: Receipt },
];

function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("mensalidades");

  return (
    <AppLayout allow={["admin", "financeiro"]}>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Financeiro</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Centro financeiro da agência</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recebimentos, contratos e comissões em um só lugar.
          </p>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {tab === "mensalidades" && <MensalidadesTab />}
          {tab === "contratos" && <ContratosTab />}
          {tab === "comissoes" && <ComissoesTab />}
        </div>
      </div>
    </AppLayout>
  );
}