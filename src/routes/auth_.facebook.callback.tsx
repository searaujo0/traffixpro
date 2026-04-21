import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { finishMetaConnection } from "@/server/meta-integration";

export const Route = createFileRoute("/auth_/facebook/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
    state: typeof s.state === "string" ? s.state : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
    error_description:
      typeof s.error_description === "string" ? s.error_description : undefined,
  }),
  component: FacebookCallback,
});

function FacebookCallback() {
  const search = useSearch({ from: "/auth_/facebook/callback" });
  const navigate = useNavigate();
  const finish = useServerFn(finishMetaConnection);
  const [msg, setMsg] = useState("Finalizando conexão com o Facebook...");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (search.error) {
      setMsg(`Erro: ${search.error_description ?? search.error}`);
      toast.error(search.error_description ?? search.error);
      return;
    }
    if (!search.code) {
      setMsg("Código não recebido.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/facebook/callback`;
    finish({ data: { code: search.code, redirectUri } })
      .then((r) => {
        if (r.ok) {
          toast.success("Facebook conectado!");
          navigate({ to: "/integracoes/meta" });
        } else {
          setMsg(r.error ?? "Falha");
          toast.error(r.error ?? "Falha ao conectar");
        }
      })
      .catch((e) => {
        setMsg(e?.message ?? "Erro");
        toast.error(e?.message ?? "Erro");
      });
  }, [search, finish, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
