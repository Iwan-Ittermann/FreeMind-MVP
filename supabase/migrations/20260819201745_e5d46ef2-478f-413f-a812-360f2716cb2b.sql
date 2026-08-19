-- 1. Move report IP addresses into an admin-only table so reporters can no longer read them
CREATE TABLE IF NOT EXISTS public.report_ips (
  report_id uuid PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  reporter_ip_address text,
  reported_user_ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.report_ips TO service_role;
ALTER TABLE public.report_ips ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated grants: this table is only reachable through the
-- admin-gated public.get_report_ips() security definer function.
CREATE POLICY "Admins can view report ips"
  ON public.report_ips FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.report_ips (report_id, reporter_ip_address, reported_user_ip_address)
SELECT id, reporter_ip_address, reported_user_ip_address
FROM public.reports
WHERE reporter_ip_address IS NOT NULL OR reported_user_ip_address IS NOT NULL
ON CONFLICT (report_id) DO NOTHING;

ALTER TABLE public.reports DROP COLUMN IF EXISTS reporter_ip_address;
ALTER TABLE public.reports DROP COLUMN IF EXISTS reported_user_ip_address;

-- 2. Read IPs from the new admin-only table
CREATE OR REPLACE FUNCTION public.get_report_ips(_report_id uuid)
RETURNS TABLE(reporter_ip_address text, reported_user_ip_address text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT ri.reporter_ip_address, ri.reported_user_ip_address
    FROM public.report_ips ri WHERE ri.report_id = _report_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_report_ips(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_report_ips(uuid) TO authenticated;

-- 3. report_content writes IPs to the admin-only table
CREATE OR REPLACE FUNCTION public.report_content(_content_id uuid, _content_type text, _law_book text, _paragraph text, _offense text, _description text DEFAULT NULL::text, _reporter_ip text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _report_id uuid;
  _uid uuid;
  _reported_user_ip text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _content_type = 'Opinion' THEN
    SELECT ip_address INTO _reported_user_ip FROM public.opinion_ips WHERE opinion_id = _content_id;
  ELSIF _content_type = 'ChatMessage' THEN
    SELECT oi.ip_address INTO _reported_user_ip
    FROM public.chat_messages cm
    JOIN public.chats c ON cm.chat_id = c.id
    JOIN public.opinions o ON (o.id = c.opinion_a_id OR o.id = c.opinion_b_id) AND o.user_id = cm.sender_id
    LEFT JOIN public.opinion_ips oi ON oi.opinion_id = o.id
    WHERE cm.id = _content_id
    LIMIT 1;
  END IF;

  INSERT INTO public.reports (
    content_id, content_type, reporting_user_id,
    law_book, paragraph, offense, description
  )
  VALUES (
    _content_id, _content_type, _uid,
    _law_book, _paragraph, _offense, _description
  )
  RETURNING id INTO _report_id;

  IF _reporter_ip IS NOT NULL OR _reported_user_ip IS NOT NULL THEN
    INSERT INTO public.report_ips (report_id, reporter_ip_address, reported_user_ip_address)
    VALUES (_report_id, _reporter_ip, _reported_user_ip)
    ON CONFLICT (report_id) DO UPDATE
      SET reporter_ip_address = EXCLUDED.reporter_ip_address,
          reported_user_ip_address = EXCLUDED.reported_user_ip_address;
  END IF;

  IF _content_type = 'Opinion' THEN
    UPDATE public.opinions SET status = 'Reported-Unreviewed' WHERE id = _content_id;
  ELSIF _content_type = 'ChatMessage' THEN
    UPDATE public.chat_messages SET status = 'Reported-Unreviewed' WHERE id = _content_id;
  END IF;

  PERFORM public.log_audit('report_content', 'reports', _report_id,
    jsonb_build_object('content_id', _content_id, 'content_type', _content_type, 'law_book', _law_book, 'paragraph', _paragraph));

  RETURN _report_id;
END;
$function$;

-- 4. Remove the hardcoded bot-UUID bypass from verified-participant checks.
--    The AI bot writes exclusively through admin-gated security definer
--    functions (upsert_bot_opinion, insert_bot_message, get_or_create_chat),
--    so it does not need a verification bypass.
CREATE OR REPLACE FUNCTION public.is_verified_participant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.verified_participants WHERE user_id = _user_id)
      OR public.has_role(_user_id, 'admin')
    );
$function$;

-- 5. Reduce the SECURITY DEFINER API surface: revoke EXECUTE from roles that
--    never need to call these internal helpers directly.
REVOKE ALL ON FUNCTION public.is_verified_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_participant(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.event_setting(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_real_event_topic(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_view_opinion(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;