import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import {
  Loader2,
  KeyRound,
  Trash2,
  ShieldCheck,
  UserCog,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  listUsers,
  setUserRole,
  resetUserPassword,
  deleteUser,
  type ManagedUser,
} from "@/server/admin-users-manage";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — TraffixPro" },
      { name: "description", content: "Gerencie usuários, papéis e acessos." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { user: me } = useAuth();
  const callList = useServerFn(listUsers);
  const callSetRole = useServerFn(setUserRole);
  const callReset = useServerFn(resetUserPassword);
  const callDelete = useServerFn(deleteUser);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const [pwUser, setPwUser] = useState<ManagedUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [delUser, setDelUser] = useState<ManagedUser | null>(null);
  const [delSubmitting, setDelSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await callList();
    if (res.error) toast.error(res.error);
    else setUsers(res.users);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleRoleChange(u: ManagedUser, role: "admin" | "cliente") {
    if (role === u.role) return;
    const res = await callSetRole({ data: { userId: u.id, role } });
    if (res.error) toast.error(res.error);
    else {
      toast.success(`${u.email} agora é ${role}`);
      void load();
    }
  }

  async function handleResetPw(e: React.FormEvent) {
    e.preventDefault();
    if (!pwUser) return;
    setPwSubmitting(true);
    const res = await callReset({ data: { userId: pwUser.id, newPassword: newPw } });
    setPwSubmitting(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(`Senha de ${pwUser.email} redefinida`);
      setPwUser(null);
      setNewPw("");
    }
  }

  async function handleDelete() {
    if (!delUser) return;
    setDelSubmitting(true);
    const res = await callDelete({ data: { userId: delUser.id } });
    setDelSubmitting(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(`${delUser.email} removido`);
      setDelUser(null);
      void load();
    }
  }

  const filtered = users.filter((u) =>
    [u.email, u.client_name, u.role].some((v) =>
      (v ?? "").toLowerCase().includes(filter.toLowerCase()),
    ),
  );

  return (
    <AppLayout>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie papéis, acessos e senhas de todos os usuários.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/40 text-sm hover:bg-secondary transition"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por email, cliente ou papel…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Papel</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente vinculado</th>
                  <th className="text-left px-4 py-3 font-medium">Último login</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.role === "admin" && (
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-medium">{u.email}</span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              você
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={u.role ?? ""}
                          onValueChange={(v) =>
                            handleRoleChange(u, v as "admin" | "cliente")
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="cliente">cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.client_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                          : "nunca"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setPwUser(u);
                              setNewPw("");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs border border-border hover:bg-secondary transition"
                            title="Redefinir senha"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Senha
                          </button>
                          <button
                            disabled={isMe}
                            onClick={() => setDelUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs border border-border text-destructive hover:bg-destructive/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isMe ? "Você não pode se deletar" : "Remover"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog redefinir senha */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{pwUser?.email}</strong>. Informe ao
              usuário pelo canal seguro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPw} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nova senha</label>
              <Input
                type="text"
                minLength={6}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
                className="mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={pwSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {pwSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCog className="h-4 w-4" />
              )}
              Redefinir
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!delUser} onOpenChange={(o) => !o && setDelUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar a conta de <strong>{delUser?.email}</strong> e desvincular
              clientes associados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={delSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
