import { insights } from "@/lib/mock-data";
import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

const iconMap = {
  warning: { Icon: AlertTriangle, cls: "text-warning bg-warning/10 border-warning/30" },
  success: { Icon: TrendingUp, cls: "text-success bg-success/10 border-success/30" },
  info: { Icon: Lightbulb, cls: "text-primary bg-primary/10 border-primary/30" },
};

export function InsightsList({ compact = false }: { compact?: boolean }) {
  const items = compact ? insights.slice(0, 3) : insights;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            Insights e Recomendações
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sugestões automáticas baseadas no desempenho
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => {
          const { Icon, cls } = iconMap[it.type];
          return (
            <div
              key={i}
              className={`flex gap-3 p-3 rounded-xl border ${cls.replace("text-", "border-").split(" ").pop()} bg-secondary/30`}
            >
              <div className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center ${cls}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{it.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{it.description}</p>
                <button className="mt-2 text-xs font-medium text-primary hover:underline">
                  → {it.action}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
