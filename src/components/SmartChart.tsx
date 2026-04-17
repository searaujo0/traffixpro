import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dailyMetrics } from "@/lib/mock-data";
import { brl, dateBR, num } from "@/lib/format";

type Mode = "spend" | "conversations" | "both";

const data = dailyMetrics.map((d) => ({
  date: dateBR(d.date),
  spend: d.spend,
  conversations: d.conversations,
}));

export function SmartChart() {
  const [mode, setMode] = useState<Mode>("both");

  const showSpend = mode === "spend" || mode === "both";
  const showConv = mode === "conversations" || mode === "both";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold">Performance — últimos 30 dias</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evolução diária de investimento e conversas
          </p>
        </div>
        <div className="flex p-1 rounded-lg bg-secondary/60 border border-border/50 text-xs">
          {(
            [
              { id: "spend", label: "Investimento" },
              { id: "conversations", label: "Conversas" },
              { id: "both", label: "Ambos" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-[var(--transition-smooth)] ${
                mode === opt.id
                  ? "bg-background text-foreground shadow-[var(--shadow-card)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.18 265)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.7 0.18 265)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
            <XAxis dataKey="date" stroke="oklch(0.68 0.03 260)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="left"
              stroke="oklch(0.68 0.03 260)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (showSpend ? brl(v) : num(v))}
            />
            {mode === "both" && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="oklch(0.68 0.03 260)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
            )}
            <Tooltip
              contentStyle={{
                background: "oklch(0.205 0.022 265)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: number, name) => {
                if (name === "Investimento") return [brl(value), name];
                return [num(value), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showSpend && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="spend"
                name="Investimento"
                stroke="oklch(0.7 0.18 265)"
                strokeWidth={2}
                fill="url(#gradSpend)"
              />
            )}
            {showConv && (
              <Area
                yAxisId={mode === "both" ? "right" : "left"}
                type="monotone"
                dataKey="conversations"
                name="Conversas"
                stroke="oklch(0.78 0.17 165)"
                strokeWidth={2}
                fill="url(#gradConv)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
