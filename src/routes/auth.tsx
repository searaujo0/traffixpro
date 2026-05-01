import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import logoM1 from "@/assets/m1-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — M1 Digital" },
      { name: "description", content: "Acesse sua conta M1 Digital." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (!role) navigate({ to: "/setup" });
    else navigate({ to: role === "admin" ? "/" : "/meu-painel" });
  }, [user, role, loading, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logoM1} alt="M1 Digital" className="h-14 w-14 object-contain mb-3" />
          <h1 className="text-xl font-semibold">M1 Digital</h1>
          <p className="text-xs text-muted-foreground mt-1">Acesse seu painel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Não possui conta? Solicite acesso ao seu gestor de tráfego.
          </p>
        </form>
      </div>
    </div>
  );
}
