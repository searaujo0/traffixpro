import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup inicial — TraffixPro" },
      { name: "description", content: "Crie o primeiro administrador do sistema." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void checkAdminExists();
  }, []);

  async function checkAdminExists() {
    setChecking(true);
    const { count, error } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (!error && (count ?? 0) > 0) setAlreadyConfigured(true);
    setChecking(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Tenta cadastrar; se já existir, faz login direto.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    const alreadyExists =
      signUpError &&
      (signUpError.message?.toLowerCase().includes("already") ||
        (signUpError as { code?: string }).code === "user_already_exists");

    if (signUpError && !alreadyExists) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (alreadyExists || !signUpData?.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(`Conta já existe e a senha não confere: ${signInError.message}`);
        setSubmitting(false);
        return;
      }
    }

    const { error: rpcError } = await supabase.rpc("bootstrap_first_admin");
    if (rpcError) {
      setError(`Falha ao atribuir admin: ${rpcError.message}`);
      setSubmitting(false);
      return;
    }

    navigate({ to: "/" });
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alreadyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 mb-3">
            <ShieldCheck className="h-6 w-6 text-success" />
          </div>
          <h1 className="text-xl font-semibold">Setup já concluído</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Já existe um administrador cadastrado neste sistema.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] cursor-pointer"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] mb-3">
            <Activity className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-semibold">Setup inicial</h1>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Crie a primeira conta de administrador. Esta tela ficará bloqueada após o primeiro cadastro.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
        >
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
              minLength={6}
              autoComplete="new-password"
              className="mt-1"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar admin
          </button>
        </form>
      </div>
    </div>
  );
}
