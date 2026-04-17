import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Megaphone,
  Wallet,
  Sparkles,
  Activity,
  Bell,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/insights", label: "Insights", icon: Sparkles },
] as const;

export function AppLayout() {
  const { location } = useRouterState();

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">TraffixPro</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Painel do Gestor
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-[var(--transition-smooth)] ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_var(--sidebar-border)]"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="rounded-xl p-3 bg-[image:var(--gradient-primary)]/10 border border-primary/20">
            <p className="text-xs font-medium text-foreground">5 clientes ativos</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Atualizado hoje às 09:00
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="flex md:hidden items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold">TraffixPro</p>
          </div>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, campanha…"
              className="pl-9 bg-secondary/50 border-border/50 h-10"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative h-10 w-10 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary transition-[var(--transition-smooth)]">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <div className="h-9 w-9 rounded-full bg-[image:var(--gradient-primary)] flex items-center justify-center text-sm font-semibold text-primary-foreground">
                LV
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-tight">Lucas Viana</p>
                <p className="text-[10px] text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-4 py-2 border-b border-border bg-background">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
