import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Atualiza nome, segmento e status de um cliente */
export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string; segment: string | null; status: string }) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200),
      segment: z.string().max(200).nullable(),
      status: z.enum(["ativo", "inativo"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ name: data.name, segment: data.segment, status: data.status })
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

/** Exclui cliente: desvincula contas, apaga vendas e remove o cliente. Mantém usuário de auth. */
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // 1. Desvincula contas de anúncio
    const { error: unlinkErr } = await context.supabase
      .from("ad_accounts" as any)
      .update({ client_id: null, updated_at: new Date().toISOString() })
      .eq("client_id", data.id);
    if (unlinkErr) return { ok: false, error: `Falha ao desvincular contas: ${unlinkErr.message}` };

    // 2. Apaga vendas
    const { error: salesErr } = await context.supabase
      .from("sales")
      .delete()
      .eq("client_id", data.id);
    if (salesErr) return { ok: false, error: `Falha ao apagar vendas: ${salesErr.message}` };

    // 3. Apaga o cliente
    const { error: clientErr } = await context.supabase
      .from("clients")
      .delete()
      .eq("id", data.id);
    if (clientErr) return { ok: false, error: clientErr.message };

    return { ok: true, error: null };
  });