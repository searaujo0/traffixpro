ALTER TABLE public.ad_insights
  ADD COLUMN IF NOT EXISTS result_type text,
  ADD COLUMN IF NOT EXISTS result_label text;