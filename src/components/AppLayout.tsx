import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Megaphone,
  Wallet,
  UserCog,
  Plug,
  Bell,
  Search,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { RoleGuard } from "@/components/RoleGuard";
import { usePermissions, type NavKey } from "@/hooks/usePermissions";
import logoM1 from "@/assets/m1-logo.png";

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; key: NavKey }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, key: "relatorios" },
  { to: "/clientes", label: "Clientes", icon: Users, key: "clientes" },
  { to: "/campanhas", label: "Campanhas", icon: Megaphone, key: "campanhas" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, key: "financeiro" },
  { to: "/integracoes/meta", label: "Meta Ads", icon: Plug, key: "meta" },
  { to: "/admin/usuarios", label: "Usuários", icon: UserCog, key: "usuarios" },
];

export function AppLayout({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: AppRole[];
}) {
  const { location } = useRouterState();
  const { user, profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { can, role } = usePermissions();

  async function handleLogout() {
    await signOut();
    navigate({ to: "/auth" });
  }

  const displayName = profile?.full_name?.trim() || user?.email || "Admin";
  const initials = (profile?.full_name?.trim() || user?.email || "AD")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // por padrão, layout aceita todos os papéis de equipe
  const allowedRoles: AppRole[] = allow ?? ["admin", "financeiro", "social_media"];

  const visibleNav = navItems.filter((item) => can(item.key));

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "financeiro"
        ? "Financeiro"
        : role === "social_media"
          ? "Social Media"
          : "";

  const subtitle =
    role === "financeiro"
      ? "Painel Financeiro"
      : role === "social_media"
        ? "Painel Social Media"
        : "Painel do Gestor";

  return (
    <RoleGuard allow={allowedRoles}>
      <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <img src={logoM1} alt="M1 Digital" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-sm font-semibold leading-tight">M1 Digital</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {subtitle}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map((item) => {
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
          <div className="rounded-xl p-3 bg-secondary/40 border border-border">
            <p className="text-xs font-medium text-foreground">Dados reais do Meta Ads</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Importe, vincule e sincronize contas.</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="flex md:hidden items-center gap-2">
            <img src={logoM1} alt="M1 Digital" className="h-8 w-8 object-contain" />
            <p className="text-sm font-semibold">M1 Digital</p>
          </div>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, campanha…"
              className="pl-9 bg-secondary/50 border-border/50 h-10"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              title={theme === "dark" ? "Modo claro" : "Modo noturno"}
              className="h-10 w-10 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary transition-[var(--transition-smooth)]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="relative h-10 w-10 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary transition-[var(--transition-smooth)]">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            </button>
            <div className="flex items-center gap-2 pl-2">
              <div className="h-9 w-9 rounded-full bg-[image:var(--gradient-primary)] flex items-center justify-center text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-tight truncate max-w-[140px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="ml-1 h-9 w-9 rounded-lg border border-border bg-secondary/40 flex items-center justify-center hover:bg-secondary transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-4 py-2 border-b border-border bg-background">
          {visibleNav.map((item) => {
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

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
    </RoleGuard>
  );
}
