ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.set_client_cancelled_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'ativo' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at = now();
  ELSIF NEW.status = 'ativo' THEN
    NEW.cancelled_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_cancelled_at ON public.clients;
CREATE TRIGGER trg_client_cancelled_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_client_cancelled_at();