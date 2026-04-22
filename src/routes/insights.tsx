import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — TraffixPro" },
      { name: "description", content: "Recomendações automáticas baseadas no desempenho real." },
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
            Recomendações automáticas baseadas no seu desempenho real.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Lightbulb className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Os insights inteligentes serão gerados automaticamente assim que houver
            volume suficiente de dados sincronizados das suas campanhas.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
