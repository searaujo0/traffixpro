import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { userId } = context;

    // Verifica que o chamador é admin
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !roleRow) {
      return { error: "Apenas admins podem criar acessos." };
    }

    // Cria usuário já confirmado
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
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
    await supabaseAdmin
      .from("profiles" as never)
      .upsert(
        { user_id: newUserId, full_name: data.fullName },
        { onConflict: "user_id" } as never,
      );

    // Atribui role cliente
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "cliente" });
    if (roleInsertErr) {
      return { error: `Usuário criado, mas falhou ao atribuir papel: ${roleInsertErr.message}` };
    }

    // Vincula ao cliente
    const { error: linkErr } = await supabaseAdmin
      .from("clients")
      .update({ owner_user_id: newUserId })
      .eq("id", data.clientId);
    if (linkErr) {
      return { error: `Papel atribuído, mas falhou ao vincular ao cliente: ${linkErr.message}` };
    }

    return { success: true, userId: newUserId };
  });
