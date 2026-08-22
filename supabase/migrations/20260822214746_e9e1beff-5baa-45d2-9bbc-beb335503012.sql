-- 1. search_path hardening for email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2. Revoke EXECUTE on internal SECURITY DEFINER helpers (used only inside RLS/other functions)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_topic_chats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_topic_directed_pairs(uuid) FROM PUBLIC;

-- 3. Server-only tables: explicitly remove client-role privileges, keep service_role
REVOKE ALL ON public.banned_emails FROM anon, authenticated;
REVOKE ALL ON public.email_templates FROM anon, authenticated;
REVOKE ALL ON public.opinion_ips FROM anon, authenticated;
REVOKE ALL ON public.question_submissions FROM anon, authenticated;
GRANT ALL ON public.banned_emails TO service_role;
GRANT ALL ON public.email_templates TO service_role;
GRANT ALL ON public.opinion_ips TO service_role;
GRANT ALL ON public.question_submissions TO service_role;

-- 4. user_roles: reads of own roles only, all writes server-side only
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;