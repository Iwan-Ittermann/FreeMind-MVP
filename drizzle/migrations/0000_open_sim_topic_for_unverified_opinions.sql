-- Pre-event /go simulation: allow opinion submissions without email verification,
-- same as the sandbox. The sim topic counts as an open topic.
CREATE OR REPLACE FUNCTION public.is_open_topic(_topic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_sandbox_topic(_topic_id)
     OR EXISTS (
       SELECT 1 FROM public.topics t
       WHERE t.id = _topic_id
         AND t.short_code = public.event_setting('sim_topic_short_code')
     )
     OR (public.is_archived_topic(_topic_id)
         AND lower(coalesce(public.event_setting('archive_open'), '')) = 'true');
$$;