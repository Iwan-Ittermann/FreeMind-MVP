
-- 1. Create admin-only opinion_ips table and migrate data
CREATE TABLE IF NOT EXISTS public.opinion_ips (
  opinion_id uuid PRIMARY KEY REFERENCES public.opinions(id) ON DELETE CASCADE,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.opinion_ips (opinion_id, ip_address, created_at)
SELECT id, ip_address, created_at FROM public.opinions WHERE ip_address IS NOT NULL
ON CONFLICT (opinion_id) DO NOTHING;

GRANT ALL ON public.opinion_ips TO service_role;
-- No grants to anon/authenticated — admin access is via SECURITY DEFINER functions only

ALTER TABLE public.opinion_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view opinion ips" ON public.opinion_ips;
CREATE POLICY "Admins can view opinion ips" ON public.opinion_ips
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Update functions that used opinions.ip_address, then drop the column
CREATE OR REPLACE FUNCTION public.submit_opinion(_topic_id uuid, _text text, _ip_address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _opinion_id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.opinions (topic_id, user_id, text)
  VALUES (_topic_id, _uid, _text)
  RETURNING id INTO _opinion_id;

  IF _ip_address IS NOT NULL THEN
    INSERT INTO public.opinion_ips (opinion_id, ip_address)
    VALUES (_opinion_id, _ip_address)
    ON CONFLICT (opinion_id) DO UPDATE SET ip_address = EXCLUDED.ip_address;
  END IF;

  RETURN _opinion_id;
END;
$function$;

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
    law_book, paragraph, offense, description,
    reporter_ip_address, reported_user_ip_address
  )
  VALUES (
    _content_id, _content_type, _uid,
    _law_book, _paragraph, _offense, _description,
    _reporter_ip, _reported_user_ip
  )
  RETURNING id INTO _report_id;

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

-- Older overload
CREATE OR REPLACE FUNCTION public.report_content(_content_id uuid, _content_type text, _law_book text, _paragraph text, _offense text, _description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _report_id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.reports (content_id, content_type, reporting_user_id, law_book, paragraph, offense, description)
  VALUES (_content_id, _content_type, _uid, _law_book, _paragraph, _offense, _description)
  RETURNING id INTO _report_id;

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

-- Drop dependent objects and column
DROP VIEW IF EXISTS public.opinions_public CASCADE;
ALTER TABLE public.opinions DROP COLUMN IF EXISTS ip_address;

-- 3. Remove hardcoded bot backdoor from is_chat_participant
CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_id uuid, checking_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.opinions oa ON c.opinion_a_id = oa.id
    JOIN public.opinions ob ON c.opinion_b_id = ob.id
    WHERE c.id = chat_id
      AND (oa.user_id = checking_user_id OR ob.user_id = checking_user_id)
  )
$function$;

-- 4. Lock down SECURITY DEFINER function execution
-- Revoke default PUBLIC execute, then grant to appropriate roles only

-- Admin/service-role only
REVOKE EXECUTE ON FUNCTION public.delete_bot_opinion(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_bot_message(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_bot_opinion(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_opinion_cascade(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_topic(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_topic_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_court_case(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_court_case(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_court_case_decision(uuid, text, date, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_report(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_soft_delete(uuid, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_opinion(uuid, boolean, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;

-- Grant to authenticated only for user-facing RPCs
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_opinion(uuid, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated;

-- User-facing RPCs (authenticated only, not anon)
REVOKE EXECUTE ON FUNCTION public.submit_opinion(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_opinion(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_topics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_topics() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_joined_topic(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_joined_topic(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_topic(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_topic(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_readonly_chat_messages(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_readonly_chat_messages(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_topic_chat_request_edges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_topic_chat_request_edges(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_topic_disagreement_pairs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_topic_disagreement_pairs(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_graph_pairs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_graph_pairs(uuid) TO authenticated;

-- Grant admin-only functions to authenticated (they self-enforce has_role checks internally)
GRANT EXECUTE ON FUNCTION public.delete_bot_opinion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_bot_opinion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_opinion_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_topic(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_topic_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_court_case(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_court_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_court_case_decision(uuid, text, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_soft_delete(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_bot_message(uuid, text) TO authenticated;

-- Email queue / internal: service_role only (revoke from PUBLIC already done in prior migration, keep as-is but ensure)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC;
