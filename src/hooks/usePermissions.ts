import { useAuth, type AppRole } from "@/contexts/AuthContext";

export type NavKey =
  | "dashboard"
  | "relatorios"
  | "clientes"
  | "campanhas"
  | "financeiro"
  | "comissoes"
  | "contratos"
  | "insights"
  | "meta"
  | "usuarios";

const PERMISSIONS: Record<NavKey, AppRole[]> = {
  dashboard: ["admin"],
  relatorios: ["admin", "social_media"],
  clientes: ["admin", "financeiro", "social_media"],
  campanhas: ["admin", "social_media"],
  financeiro: ["admin", "financeiro"],
  comissoes: ["admin", "financeiro"],
  contratos: ["admin", "financeiro"],
  insights: ["admin", "social_media"],
  meta: ["admin"],
  usuarios: ["admin"],
};

export function usePermissions() {
  const { role, assignedClientIds } = useAuth();

  const can = (key: NavKey) => !!role && PERMISSIONS[key].includes(role);

  return {
    role,
    can,
    canSeeMoney: role !== "social_media",
    canManageUsers: role === "admin",
    canManageContracts: role === "admin" || role === "financeiro",
    canManageClients: role === "admin" || role === "financeiro",
    canSeeClient: (clientId: string) => {
      if (role === "admin" || role === "financeiro") return true;
      if (role === "social_media") return assignedClientIds.includes(clientId);
      return false;
    },
    assignedClientIds,
  };
}
