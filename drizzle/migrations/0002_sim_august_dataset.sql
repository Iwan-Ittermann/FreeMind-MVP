ALTER TABLE public.sim_state ADD COLUMN IF NOT EXISTS august_lease_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_sim_topic(v_topic uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.app_settings s ON s.key IN ('sim_topic_short_code', 'sim_august_topic_short_code')
    WHERE t.id = v_topic AND t.short_code = btrim(s.value)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_open_topic(_topic_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_sandbox_topic(_topic_id)
     OR public.is_sim_topic(_topic_id)
     OR (public.is_archived_topic(_topic_id)
         AND lower(coalesce(public.event_setting('archive_open'), '')) = 'true');
$$;