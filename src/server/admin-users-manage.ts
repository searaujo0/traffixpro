import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Apenas admins.");
}

export type ManagedUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "cliente" | null;
  client_id: string | null;
  client_name: string | null;
};

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) return { error: usersErr.message, users: [] as ManagedUser[] };

    const ids = usersData.users.map((u) => u.id);
    const [{ data: roles }, { data: clients }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("clients").select("id, name, owner_user_id").in("owner_user_id", ids),
    ]);

    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    const clientMap = new Map(
      (clients ?? []).map((c) => [c.owner_user_id as string, { id: c.id, name: c.name }]),
    );

    const users: ManagedUser[] = usersData.users.map((u) => {
      const c = clientMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        role: (roleMap.get(u.id) as "admin" | "cliente" | undefined) ?? null,
        client_id: c?.id ?? null,
        client_name: c?.name ?? null,
      };
    });

    return { users, error: null as string | null };
  });

const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "cliente"]),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => setRoleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // remove roles existentes do usuário e insere a nova (mantém simples: 1 role)
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) return { error: delErr.message };
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (insErr) return { error: insErr.message };
    return { success: true };
  });

const resetPwSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(6).max(128),
});

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => resetPwSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) return { error: error.message };
    return { success: true };
  });

const deleteUserSchema = z.object({ userId: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteUserSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      return { error: "Você não pode deletar sua própria conta." };
    }
    // desvincula clientes
    await supabaseAdmin
      .from("clients")
      .update({ owner_user_id: null })
      .eq("owner_user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) return { error: error.message };
    return { success: true };
  });
