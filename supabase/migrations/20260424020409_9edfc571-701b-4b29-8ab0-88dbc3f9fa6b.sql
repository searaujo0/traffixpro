ALTER TABLE public.ad_insights ADD COLUMN IF NOT EXISTS messages bigint NOT NULL DEFAULT 0;

CREATE POLICY "Clients delete own sales"
ON public.sales
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = sales.client_id AND c.owner_user_id = auth.uid()));