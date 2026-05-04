-- Helpers
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = ANY(_roles)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM PUBLIC, anon;

-- Tabela de atribuições
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE(client_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_client_assignments_user ON public.client_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON public.client_assignments(client_id);
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_assigned_to_client(_user_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_assignments
    WHERE user_id = _user_id AND client_id = _client_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_assigned_to_client(uuid, uuid) FROM PUBLIC, anon;

-- Tabela de contratos
CREATE TABLE IF NOT EXISTS public.client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  monthly_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date,
  is_indeterminate boolean NOT NULL DEFAULT false,
  payment_day int CHECK (payment_day BETWEEN 1 AND 31),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','suspenso')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_contracts_client ON public.client_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_status ON public.client_contracts(status);
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_client_contracts_updated_at ON public.client_contracts;
CREATE TRIGGER trg_client_contracts_updated_at
BEFORE UPDATE ON public.client_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_contract_dates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_indeterminate THEN
    NEW.end_date = NULL;
  ELSIF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'Data de fim não pode ser anterior à data de início';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_contract_dates ON public.client_contracts;
CREATE TRIGGER trg_validate_contract_dates
BEFORE INSERT OR UPDATE ON public.client_contracts
FOR EACH ROW EXECUTE FUNCTION public.validate_contract_dates();

CREATE OR REPLACE FUNCTION public.ensure_single_active_contract()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ativo' THEN
    UPDATE public.client_contracts
       SET status = 'encerrado'
     WHERE client_id = NEW.client_id
       AND id <> NEW.id
       AND status = 'ativo';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_single_active_contract ON public.client_contracts;
CREATE TRIGGER trg_single_active_contract
AFTER INSERT OR UPDATE OF status ON public.client_contracts
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_contract();

CREATE OR REPLACE FUNCTION public.sync_client_contract_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_active_value numeric;
  v_client uuid;
BEGIN
  v_client := COALESCE(NEW.client_id, OLD.client_id);
  SELECT monthly_value INTO v_active_value
    FROM public.client_contracts
   WHERE client_id = v_client AND status = 'ativo'
   ORDER BY start_date DESC LIMIT 1;
  UPDATE public.clients SET contract_value = COALESCE(v_active_value, 0) WHERE id = v_client;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_client_contract_value ON public.client_contracts;
CREATE TRIGGER trg_sync_client_contract_value
AFTER INSERT OR UPDATE OR DELETE ON public.client_contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_client_contract_value();

-- RLS — client_assignments
DROP POLICY IF EXISTS "Admins manage assignments" ON public.client_assignments;
CREATE POLICY "Admins manage assignments" ON public.client_assignments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users see own assignments" ON public.client_assignments;
CREATE POLICY "Users see own assignments" ON public.client_assignments
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','financeiro']));

-- RLS — client_contracts
DROP POLICY IF EXISTS "Admin and finance manage contracts" ON public.client_contracts;
CREATE POLICY "Admin and finance manage contracts" ON public.client_contracts
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','financeiro']));

DROP POLICY IF EXISTS "Clients view own contracts" ON public.client_contracts;
CREATE POLICY "Clients view own contracts" ON public.client_contracts
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contracts.client_id AND c.owner_user_id = auth.uid()));

-- RLS — clients: financeiro e social_media
DROP POLICY IF EXISTS "Finance view all clients" ON public.clients;
CREATE POLICY "Finance view all clients" ON public.clients
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'financeiro'));

DROP POLICY IF EXISTS "Finance update clients" ON public.clients;
CREATE POLICY "Finance update clients" ON public.clients
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'financeiro'));

DROP POLICY IF EXISTS "Social media view assigned clients" ON public.clients;
CREATE POLICY "Social media view assigned clients" ON public.clients
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'social_media') AND public.is_assigned_to_client(auth.uid(), id));

-- RLS — campaigns
DROP POLICY IF EXISTS "Social media view assigned campaigns" ON public.campaigns;
CREATE POLICY "Social media view assigned campaigns" ON public.campaigns
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'social_media') AND public.is_assigned_to_client(auth.uid(), client_id));

-- RLS — ad_accounts
DROP POLICY IF EXISTS "Social media view assigned ad accounts" ON public.ad_accounts;
CREATE POLICY "Social media view assigned ad accounts" ON public.ad_accounts
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'social_media') AND client_id IS NOT NULL AND public.is_assigned_to_client(auth.uid(), client_id));

-- RLS — ad_insights
DROP POLICY IF EXISTS "Social media view assigned insights" ON public.ad_insights;
CREATE POLICY "Social media view assigned insights" ON public.ad_insights
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'social_media') AND EXISTS (
  SELECT 1 FROM public.ad_accounts a
  WHERE a.id = ad_insights.ad_account_id AND a.client_id IS NOT NULL
    AND public.is_assigned_to_client(auth.uid(), a.client_id)
));

-- RLS — client_payments e sales: financeiro
DROP POLICY IF EXISTS "Finance manage payments" ON public.client_payments;
CREATE POLICY "Finance manage payments" ON public.client_payments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'financeiro'));

DROP POLICY IF EXISTS "Finance view all sales" ON public.sales;
CREATE POLICY "Finance view all sales" ON public.sales
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'financeiro'));

-- RLS — profiles: financeiro pode ver
DROP POLICY IF EXISTS "Finance view profiles" ON public.profiles;
CREATE POLICY "Finance view profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'financeiro'));

-- Backfill: criar contrato indeterminado pra cada cliente que já tinha contract_value
INSERT INTO public.client_contracts (client_id, monthly_value, start_date, is_indeterminate, status, notes)
SELECT c.id, c.contract_value, COALESCE(c.created_at::date, CURRENT_DATE), true, 'ativo',
       'Contrato criado automaticamente a partir do valor existente'
  FROM public.clients c
 WHERE c.contract_value > 0
   AND NOT EXISTS (SELECT 1 FROM public.client_contracts cc WHERE cc.client_id = c.id);