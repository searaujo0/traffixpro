import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_RUNTIME_UNAVAILABLE_MESSAGE,
  assertAdminAccess,
  getAdminClientSafe,
} from "@/server/admin-runtime";

export type ManagedUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "cliente" | "financeiro" | "social_media" | null;
  client_id: string | null;
  client_name: string | null;
};

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) {
      return { error: adminAccess.error, users: [] as ManagedUser[] };
    }

    const adminClient = getAdminClientSafe();
    if (!adminClient) {
      return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE, users: [] as ManagedUser[] };
    }

    const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) return { error: usersErr.message, users: [] as ManagedUser[] };

    const ids = usersData.users.map((u) => u.id);
    const [{ data: roles }, { data: clients }] = await Promise.all([
      adminClient.from("user_roles").select("user_id, role").in("user_id", ids),
      adminClient.from("clients").select("id, name, owner_user_id").in("owner_user_id", ids),
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
        role:
          (roleMap.get(u.id) as
            | "admin"
            | "cliente"
            | "financeiro"
            | "social_media"
            | undefined) ?? null,
        client_id: c?.id ?? null,
        client_name: c?.name ?? null,
      };
    });

    return { users, error: null as string | null };
  });

const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "cliente", "financeiro", "social_media"]),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => setRoleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error };

    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE };

    // remove roles existentes do usuário e insere a nova (mantém simples: 1 role)
    const { error: delErr } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) return { error: delErr.message };
    const { error: insErr } = await adminClient
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
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error };

    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE };

    const { error } = await adminClient.auth.admin.updateUserById(data.userId, {
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
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error };

    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE };

    if (data.userId === context.userId) {
      return { error: "Você não pode deletar sua própria conta." };
    }
    // desvincula clientes
    await adminClient
      .from("clients")
      .update({ owner_user_id: null })
      .eq("owner_user_id", data.userId);
    await adminClient.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await adminClient.auth.admin.deleteUser(data.userId);
    if (error) return { error: error.message };
    return { success: true };
  });
