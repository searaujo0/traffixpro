-- 1. Adiciona campos de contrato e equipe ao cliente
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_team_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Tabela de pagamentos mensais do cliente (contratos pagos)
CREATE TABLE IF NOT EXISTS public.client_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reference_year int NOT NULL,
  reference_month int NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente','atrasado')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, reference_year, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_client_payments_client ON public.client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_ref ON public.client_payments(reference_year, reference_month);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all client payments"
  ON public.client_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own payments"
  ON public.client_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_payments.client_id AND c.owner_user_id = auth.uid()));

CREATE TRIGGER update_client_payments_updated_at
  BEFORE UPDATE ON public.client_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();