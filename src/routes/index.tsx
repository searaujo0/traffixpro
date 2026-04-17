import { createFileRoute } from "@tanstack/react-router";
import {
  DollarSign,
  MessageCircle,
  Target,
  TrendingUp,
  Wallet,
  Receipt,
  MousePointerClick,
  Eye,
  Users as UsersIcon,
  Repeat,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { SmartChart } from "@/components/SmartChart";
import { AudiencePanel } from "@/components/AudiencePanel";
import { InsightsList } from "@/components/InsightsList";
import { kpis } from "@/lib/mock-data";
import { brl, brlPrecise, num, pct } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TraffixPro" },
      {
        name: "description",
        content:
          "Acompanhe investimento, conversas, ROI e faturamento das suas campanhas de tráfego pago em tempo real.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Visão geral · últimos 30 dias
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Olá, Lucas 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suas campanhas geraram <span className="text-foreground font-medium">{brl(kpis.revenue)}</span> em
              faturamento — ROI de{" "}
              <span className="text-success font-medium">{pct(kpis.roi)}</span>.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <button className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground/80">
              Diário
            </button>
            <button className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
              Mensal
            </button>
          </div>
        </div>

        {/* Financial highlight */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Resultado financeiro
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Faturamento total"
              value={brl(kpis.revenue)}
              hint={`${kpis.sales} vendas no período`}
              delta={18.4}
              icon={Wallet}
              accent="success"
              highlight
            />
            <KpiCard
              label="ROI"
              value={pct(kpis.roi)}
              hint="Retorno sobre investimento"
              delta={12.7}
              icon={TrendingUp}
              accent="primary"
              highlight
            />
            <KpiCard
              label="Custo por venda"
              value={brl(kpis.costPerSale)}
              hint={`Investimento de ${brl(kpis.spend)}`}
              delta={-6.2}
              icon={Receipt}
              accent="warning"
              highlight
            />
          </div>
        </section>

        {/* Traffic KPIs */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Métricas de tráfego
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Investimento"
              value={brl(kpis.spend)}
              icon={DollarSign}
              delta={4.1}
            />
            <KpiCard
              label="Conversas"
              value={num(kpis.conversations)}
              hint={`${brlPrecise(kpis.costPerConversation)} por conversa`}
              icon={MessageCircle}
              accent="success"
              delta={9.3}
            />
            <KpiCard
              label="Cliques no link"
              value={num(kpis.clicks)}
              hint={`CTR ${pct(kpis.ctr)} · CPC ${brlPrecise(kpis.cpc)}`}
              icon={MousePointerClick}
              delta={2.5}
            />
            <KpiCard
              label="Taxa de conversão"
              value={pct(kpis.conversionRate)}
              hint="Cliques → conversas"
              icon={Target}
              accent="primary"
              delta={-1.4}
            />
            <KpiCard label="Impressões" value={num(kpis.impressions)} icon={Eye} />
            <KpiCard label="Alcance" value={num(kpis.reach)} icon={UsersIcon} />
            <KpiCard
              label="Frequência"
              value={kpis.frequency.toFixed(2).replace(".", ",")}
              hint="Vezes por pessoa"
              icon={Repeat}
              accent={kpis.frequency > 4 ? "warning" : "primary"}
            />
            <KpiCard
              label="CPM"
              value={brlPrecise(kpis.cpm)}
              hint="Custo por mil impressões"
              icon={DollarSign}
            />
          </div>
        </section>

        {/* Chart + audience */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SmartChart />
          </div>
          <AudiencePanel />
        </div>

        {/* Insights */}
        <InsightsList compact />
      </div>
    </AppLayout>
  );
}
