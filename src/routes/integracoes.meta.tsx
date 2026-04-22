import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Facebook, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  getMetaAuthUrl,
  listMetaConnections,
  importAdAccounts,
  linkAdAccountToClient,
  syncInsights,
} from "@/server/meta-integration";
import { fetchClients, type ClientRow } from "@/lib/data";

export const Route = createFileRoute("/integracoes/meta")({
  head: () => ({
    meta: [
      { title: "Integração Meta Ads | CRM" },
      { name: "description", content: "Conecte suas contas de anúncio do Facebook." },
    ],
  }),
  component: MetaIntegrationPage,
});

type Connection = { id: string; meta_user_id: string; meta_user_name: string | null; expires_at: string | null };
type AdAccount = { id: string; name: string; currency: string | null; status: string | null; business_name: string | null; client_id: string | null; connection_id: string };

function MetaIntegrationPage() {
  const navigate = useNavigate();
  const getUrl = useServerFn(getMetaAuthUrl);
  const list = useServerFn(listMetaConnections);
  const importFn = useServerFn(importAdAccounts);
  const linkFn = useServerFn(linkAdAccountToClient);
  const syncFn = useServerFn(syncInsights);

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);

  async function load() {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        list().catch(() => ({ connections: [], accounts: [] })),
        fetchClients().catch(() => []),
      ]);
      setConnections(((r as any)?.connections ?? []) as Connection[]);
      setAccounts(((r as any)?.accounts ?? []) as AdAccount[]);
      setClients(c ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleConnect() {
    setBusy("connect");
    try {
      const redirectUri = `${window.location.origin}/auth/facebook/callback`;
      const r = await getUrl({ data: { redirectUri } });
      if (!r.url) {
        toast.error(r.error ?? "Falha ao gerar URL");
        return;
      }
      window.location.href = r.url;
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(connId: string) {
    setBusy(connId);
    try {
      const r = await importFn({ data: { connectionId: connId } });
      if (!r.ok) toast.error(r.error ?? "Erro");
      else toast.success(`${r.count} contas importadas`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function handleLink(adAccountId: string, clientId: string) {
    setBusy(adAccountId);
    try {
      const r = await linkFn({
        data: { adAccountId, clientId: clientId === "__none" ? null : clientId },
      });
      if (!r.ok) toast.error(r.error ?? "Erro");
      else toast.success("Vínculo atualizado");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function handleSync(adAccountId: string) {
    setBusy(adAccountId + ":sync");
    try {
      const r = await syncFn({ data: { adAccountId, days } });
      if (!r.ok) toast.error(r.error ?? "Erro");
      else toast.success(`${r.count} dias sincronizados`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Integração Meta Ads</h1>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta do Facebook para puxar dados das contas de anúncio que você gerencia.
          </p>
        </header>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold">Conectar com Facebook</h2>
              <p className="text-sm text-muted-foreground">
                Autorize o app a ler suas contas de anúncio (ads_read, business_management).
              </p>
            </div>
            <Button onClick={handleConnect} disabled={busy === "connect"}>
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
              <span className="ml-2">Conectar Facebook</span>
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold">Período de sincronização</h2>
              <p className="text-sm text-muted-foreground">
                Escolha quantos dias buscar ao clicar em "Sync" em cada conta.
              </p>
            </div>
            <div className="flex p-1 rounded-lg bg-secondary border border-border/60 text-xs">
              {[
                { d: 1, l: "Hoje" },
                { d: 7, l: "7 dias" },
                { d: 30, l: "30 dias" },
              ].map((opt) => (
                <button
                  key={opt.d}
                  onClick={() => setDays(opt.d)}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    days === opt.d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : connections.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma conexão ainda. Clique em "Conectar Facebook" acima.
          </Card>
        ) : (
          connections.map((conn) => {
            const connAccounts = accounts.filter((a) => a.connection_id === conn.id);
            return (
              <Card key={conn.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">{conn.meta_user_name ?? conn.meta_user_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Token expira: {conn.expires_at ? new Date(conn.expires_at).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleImport(conn.id)} disabled={busy === conn.id}>
                    {busy === conn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">Importar contas</span>
                  </Button>
                </div>

                {connAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta importada. Clique em "Importar contas".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {connAccounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border flex-wrap">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.id} · {a.currency ?? "—"}
                            {a.business_name ? ` · ${a.business_name}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={a.client_id ?? "__none"}
                            onValueChange={(v) => handleLink(a.id, v)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Vincular cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">— sem vínculo —</SelectItem>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSync(a.id)}
                            disabled={busy === a.id + ":sync"}
                          >
                            {busy === a.id + ":sync" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Link2 className="h-4 w-4" />
                                <span className="ml-1">Sync</span>
                              </>
                            )}
                          </Button>
                          {a.client_id && <Badge variant="secondary">vinculada</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
