import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_RUNTIME_UNAVAILABLE_MESSAGE,
  assertAdminAccess,
  getAdminClientSafe,
} from "@/server/admin-runtime";

const createClientUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  fullName: z.string().min(1).max(255),
  clientId: z.string().uuid(),
});

export const createClientUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createClientUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminAccess = await assertAdminAccess(context.supabase, context.userId);
    if (!adminAccess.ok) {
      return { error: adminAccess.error };
    }

    const adminClient = getAdminClientSafe();
    if (!adminClient) return { error: ADMIN_RUNTIME_UNAVAILABLE_MESSAGE };

    // Cria usuário já confirmado
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (createErr || !created.user) {
      return { error: createErr?.message ?? "Falha ao criar usuário." };
    }

    const newUserId = created.user.id;

    // Garante profile com nome (caso o trigger não esteja ativo)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient.from("profiles" as any) as any).upsert(
      { user_id: newUserId, full_name: data.fullName },
      { onConflict: "user_id" },
    );

    // Atribui role cliente
    const { error: roleInsertErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: "cliente" });
    if (roleInsertErr) {
      return { error: `Usuário criado, mas falhou ao atribuir papel: ${roleInsertErr.message}` };
    }

    // Vincula ao cliente
    const { error: linkErr } = await adminClient
      .from("clients")
      .update({ owner_user_id: newUserId })
      .eq("id", data.clientId);
    if (linkErr) {
      return { error: `Papel atribuído, mas falhou ao vincular ao cliente: ${linkErr.message}` };
    }

    return { success: true, userId: newUserId };
  });
