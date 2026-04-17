import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  hint?: string;
  delta?: number; // percent
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive";
  highlight?: boolean;
};

const accentClass: Record<NonNullable<Props["accent"]>, string> = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  accent = "primary",
  highlight = false,
}: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-[var(--transition-smooth)] hover:-translate-y-0.5 ${
        highlight
          ? "border-primary/30 bg-[image:var(--gradient-card)] shadow-[var(--shadow-glow)]"
          : "border-border bg-card shadow-[var(--shadow-card)]"
      }`}
    >
      {highlight && (
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accentClass[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium ${
              positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            }`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs. período anterior</span>
        </div>
      )}
    </div>
  );
}
