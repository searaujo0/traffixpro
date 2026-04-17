CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Admin already exists';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin');
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;