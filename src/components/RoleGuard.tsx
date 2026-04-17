import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

export function RoleGuard({
  children,
  allow,
}: {
  children: ReactNode;
  allow: AppRole[];
}) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!role) {
      // autenticado, mas sem role atribuída → bootstrap/setup
      navigate({ to: "/setup" });
      return;
    }
    if (!allow.includes(role)) {
      navigate({ to: role === "admin" ? "/" : "/meu-painel" });
    }
  }, [user, role, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!role || !allow.includes(role)) return null;
  return <>{children}</>;
}
