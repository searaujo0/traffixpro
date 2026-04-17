
-- meta_connections: 1 usuário pode ter 1+ conexões com o Facebook
CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meta_user_id text NOT NULL,
  meta_user_name text,
  access_token text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, meta_user_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own meta connections"
ON public.meta_connections FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins all meta connections"
ON public.meta_connections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ad_accounts: contas de anúncio Meta que o user vê via sua conexão
CREATE TABLE public.ad_accounts (
  id text PRIMARY KEY, -- ex "act_123456"
  connection_id uuid NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  currency text,
  status text,
  business_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ad accounts"
ON public.ad_accounts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.meta_connections mc WHERE mc.id = ad_accounts.connection_id AND mc.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.meta_connections mc WHERE mc.id = ad_accounts.connection_id AND mc.user_id = auth.uid()));

CREATE POLICY "Admins all ad accounts"
ON public.ad_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own ad accounts"
ON public.ad_accounts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = ad_accounts.client_id AND c.owner_user_id = auth.uid()));

-- ad_insights: cache diário de métricas
CREATE TABLE public.ad_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id text NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_account_id, date)
);

CREATE INDEX idx_ad_insights_account_date ON public.ad_insights(ad_account_id, date DESC);

ALTER TABLE public.ad_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own insights"
ON public.ad_insights FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_accounts a
  JOIN public.meta_connections mc ON mc.id = a.connection_id
  WHERE a.id = ad_insights.ad_account_id AND mc.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ad_accounts a
  JOIN public.meta_connections mc ON mc.id = a.connection_id
  WHERE a.id = ad_insights.ad_account_id AND mc.user_id = auth.uid()
));

CREATE POLICY "Admins all insights"
ON public.ad_insights FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own client insights"
ON public.ad_insights FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_accounts a
  JOIN public.clients c ON c.id = a.client_id
  WHERE a.id = ad_insights.ad_account_id AND c.owner_user_id = auth.uid()
));
