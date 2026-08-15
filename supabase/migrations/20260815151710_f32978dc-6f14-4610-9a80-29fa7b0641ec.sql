-- 1. Reports: hide IP columns from non-admins via column-level privileges
REVOKE SELECT ON public.reports FROM anon, authenticated;
GRANT SELECT (id, content_id, content_type, reporting_user_id, law_book, paragraph, offense, description, created_at, status, admin_id, review_timestamp)
  ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reports TO service_role;

CREATE OR REPLACE FUNCTION public.get_report_ips(_report_id uuid)
RETURNS TABLE(reporter_ip_address text, reported_user_ip_address text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT r.reporter_ip_address, r.reported_user_ip_address
    FROM public.reports r WHERE r.id = _report_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_report_ips(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_report_ips(uuid) TO authenticated;

-- 2. chat_messages: participants may only set read_at
REVOKE UPDATE ON public.chat_messages FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

-- 3. Lock down SECURITY DEFINER functions
-- Internal-only (service role / cron / triggers)
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insert_bot_message(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_fake_node_opinion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_accept_bot_requests() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.report_content(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Authenticated-only (admin/participant actions): drop anon access
REVOKE ALL ON FUNCTION public.approve_court_case(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_court_case(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_bot_opinion(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_opinion_cascade(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_soft_delete(uuid, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_court_case_decision(uuid, text, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_topic_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_bot_opinion(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_opinion(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_content(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_court_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_court_case(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_bot_opinion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_opinion_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_soft_delete(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_court_case_decision(uuid, text, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_topic_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_bot_opinion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_opinion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) TO authenticated;
