import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { InsightsList } from "@/components/InsightsList";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — TraffixPro" },
      { name: "description", content: "Recomendações automáticas para otimizar campanhas." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise automática do desempenho das suas campanhas.
          </p>
        </div>
        <InsightsList />
      </div>
    </AppLayout>
  );
}
