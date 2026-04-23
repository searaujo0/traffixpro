ALTER TABLE public.ad_accounts
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT NOT NULL DEFAULT 'never',
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ad_insights_ad_account_date_unique
ON public.ad_insights (ad_account_id, date);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_client_id
ON public.ad_accounts (client_id);

CREATE INDEX IF NOT EXISTS idx_ad_insights_ad_account_date
ON public.ad_insights (ad_account_id, date DESC);