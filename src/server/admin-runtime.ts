import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type AuthenticatedSupabase = SupabaseClient<Database>;

export const ADMIN_RUNTIME_UNAVAILABLE_MESSAGE =
  "As ações avançadas de usuários estão indisponíveis neste preview agora. Recarregue o projeto e tente de novo.";

export async function assertAdminAccess(supabase: AuthenticatedSupabase, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !data) {
    return { ok: false as const, error: "Apenas admins." };
  }

  return { ok: true as const };
}

export function getAdminClientSafe() {
  try {
    void supabaseAdmin.auth;
    return supabaseAdmin;
  } catch {
    return null;
  }
}