ALTER TABLE public.signups ALTER COLUMN daily_report_opt_in SET DEFAULT true;
UPDATE public.signups SET daily_report_opt_in = true WHERE daily_report_opt_in = false;

ALTER TABLE public.signups ADD COLUMN IF NOT EXISTS notification_digest_opt_in boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_notification_digest_opt_in()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(bool_or(notification_digest_opt_in), true)
  FROM public.signups
  WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.set_notification_digest_opt_in(_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
  _rows integer;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.signups
  SET notification_digest_opt_in = _enabled
  WHERE auth_user_id = _uid;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.get_notification_digest_opt_in() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_notification_digest_opt_in(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_notification_digest_opt_in() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_digest_opt_in(boolean) TO authenticated;