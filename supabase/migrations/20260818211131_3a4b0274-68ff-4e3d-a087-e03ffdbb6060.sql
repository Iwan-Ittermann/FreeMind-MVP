CREATE TABLE public.daily_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL UNIQUE,
  title text NOT NULL,
  body_md text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.daily_reports TO anon;
GRANT SELECT ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily reports are publicly readable"
ON public.daily_reports FOR SELECT
USING (true);

CREATE TRIGGER update_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.signups
  ADD COLUMN IF NOT EXISTS daily_report_opt_in boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_daily_report_opt_in(_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SET daily_report_opt_in = _enabled
  WHERE auth_user_id = _uid;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_report_opt_in()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(bool_or(daily_report_opt_in), false)
  FROM public.signups
  WHERE auth_user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.set_daily_report_opt_in(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_daily_report_opt_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_daily_report_opt_in(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_report_opt_in() TO authenticated;