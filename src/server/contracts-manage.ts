import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Contract = {
  id: string;
  client_id: string;
  monthly_value: number;
  start_date: string;
  end_date: string | null;
  is_indeterminate: boolean;
  payment_day: number | null;
  status: "ativo" | "encerrado" | "suspenso";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const baseSchema = z.object({
  client_id: z.string().uuid(),
  monthly_value: z.number().min(0),
  start_date: z.string(), // YYYY-MM-DD
  end_date: z.string().nullable().optional(),
  is_indeterminate: z.boolean(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  status: z.enum(["ativo", "encerrado", "suspenso"]).default("ativo"),
  notes: z.string().max(2000).nullable().optional(),
});

export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => baseSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("client_contracts" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        client_id: data.client_id,
        monthly_value: data.monthly_value,
        start_date: data.start_date,
        end_date: data.is_indeterminate ? null : (data.end_date ?? null),
        is_indeterminate: data.is_indeterminate,
        payment_day: data.payment_day ?? null,
        status: data.status,
        notes: data.notes ?? null,
        created_by: context.userId,
      } as any)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message, id: null as string | null };
    return { ok: true, error: null, id: ((row as { id: string } | null)?.id) ?? null };
  });

const updateSchema = baseSchema.extend({ id: z.string().uuid() });
export const updateContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_contracts" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        monthly_value: data.monthly_value,
        start_date: data.start_date,
        end_date: data.is_indeterminate ? null : (data.end_date ?? null),
        is_indeterminate: data.is_indeterminate,
        payment_day: data.payment_day ?? null,
        status: data.status,
        notes: data.notes ?? null,
      } as any)
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

export const deleteContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_contracts" as never)
      .delete()
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

export const listContractsByClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ clientId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("client_contracts" as never)
      .select("*")
      .eq("client_id", data.clientId)
      .order("start_date", { ascending: false });
    if (error) return { error: error.message, contracts: [] as Contract[] };
    return { error: null, contracts: ((rows ?? []) as unknown as Contract[]) };
  });

export const listAllContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("client_contracts" as never)
      .select("*, clients(name)")
      .order("start_date", { ascending: false });
    if (error) return { error: error.message, contracts: [] as (Contract & { client_name: string })[] };
    const contracts = ((rows ?? []) as unknown as (Contract & { clients: { name: string } | null })[])
      .map((r) => ({ ...r, client_name: r.clients?.name ?? "—" }));
    return { error: null, contracts };
  });
