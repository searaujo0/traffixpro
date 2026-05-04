import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_RUNTIME_UNAVAILABLE_MESSAGE,
  assertAdminAccess,
  getAdminClientSafe,
} from "@/server/admin-runtime";

const TEAM_ROLES = ["admin", "financeiro", "social_media", "cliente"] as const;
type TeamRole = (typeof TEAM_ROLES)[number];

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  fullName: z.string().min(1).max(120).optional().nullable(),
  role: z.enum(TEAM_ROLES),
  clientIds: z.array(z.string().uuid()).optional().default([]),
});

/** Cria um usuário de equipe (admin / financeiro / social_media). */
export const createTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error, userId: null };
    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE, userId: null };

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.fullName ? { full_name: data.fullName } : undefined,
    });
    if (createErr || !created.user) {
      return { error: createErr?.message ?? "Falha ao criar usuário", userId: null };
    }
    const newUserId = created.user.id;

    // role
    await adminClient.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleErr) return { error: roleErr.message, userId: newUserId };

    // assignments (apenas para social_media)
    if (data.role === "social_media" && data.clientIds.length > 0) {
      const rows = data.clientIds.map((cid) => ({
        client_id: cid,
        user_id: newUserId,
        assigned_by: context.userId,
      }));
      const { error: aerr } = await adminClient
        .from("client_assignments" as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(rows as any);
      if (aerr) return { error: `Usuário criado mas falha nas atribuições: ${aerr.message}`, userId: newUserId };
    }

    return { error: null, userId: newUserId };
  });

const setAssignSchema = z.object({
  userId: z.string().uuid(),
  clientIds: z.array(z.string().uuid()),
});

/** Substitui as atribuições de um usuário pelos clientIds informados. */
export const setUserAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => setAssignSchema.parse(i))
  .handler(async ({ data, context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error };
    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE };

    await adminClient
      .from("client_assignments" as any)
      .delete()
      .eq("user_id", data.userId);

    if (data.clientIds.length > 0) {
      const rows = data.clientIds.map((cid) => ({
        client_id: cid,
        user_id: data.userId,
        assigned_by: context.userId,
      }));
      const { error } = await adminClient
        .from("client_assignments" as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(rows as any);
      if (error) return { error: error.message };
    }
    return { error: null };
  });

/** Lista atribuições agregadas por usuário. */
export const listAssignmentsByUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error, byUser: {} as Record<string, string[]> };
    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE, byUser: {} };

    const { data, error } = await adminClient
      .from("client_assignments" as any)
      .select("user_id, client_id");
    if (error) return { error: error.message, byUser: {} };

    const byUser: Record<string, string[]> = {};
    for (const row of (data ?? []) as unknown as { user_id: string; client_id: string }[]) {
      (byUser[row.user_id] ??= []).push(row.client_id);
    }
    return { error: null, byUser };
  });

/** Substitui setUserRole permitindo todos os papéis. */
const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(TEAM_ROLES),
});

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => setRoleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) return { error: adminAccess.error };
    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE };

    await adminClient.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await adminClient
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) return { error: error.message };

    // se mudou pra algo diferente de social_media, limpa atribuições
    if (data.role !== "social_media") {
      await adminClient
        .from("client_assignments" as any)
        .delete()
        .eq("user_id", data.userId);
    }
    return { error: null };
  });

export type { TeamRole };
