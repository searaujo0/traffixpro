import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  reference_year: z.number().int().min(2000).max(2100),
  reference_month: z.number().int().min(1).max(12),
  amount: z.number().min(0),
  payment_date: z.string().min(1),
  status: z.enum(["pago", "pendente", "atrasado"]).default("pago"),
  notes: z.string().max(500).nullable().optional(),
});

export const upsertClientPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const payload = {
      client_id: data.client_id,
      reference_year: data.reference_year,
      reference_month: data.reference_month,
      amount: data.amount,
      payment_date: data.payment_date,
      status: data.status,
      notes: data.notes ?? null,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await sb.from("client_payments").update(payload).eq("id", data.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, error: null };
    }
    const { error } = await sb.from("client_payments").upsert(payload, {
      onConflict: "client_id,reference_year,reference_month",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

export const deleteClientPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("client_payments").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });