
-- Revoke anon EXECUTE on all sensitive functions; keep only public graph readers open to anon.
REVOKE EXECUTE ON FUNCTION public.approve_court_case(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_court_case(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_topic(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_bot_opinion(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_opinion_cascade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_readonly_chat_messages(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_topics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_joined_topic(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_topic(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_opinion(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_soft_delete(uuid, text, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_court_case_decision(uuid, text, date, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_topic_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_bot_opinion(uuid, text) FROM PUBLIC, anon;

-- Also revoke from authenticated for admin-only functions (they check has_role inside, but scanner flags execute access).
-- These require admin — restrict execute to service_role only? No — the RPCs check admin role internally.
-- Keep authenticated grants so admins (who are authenticated) can call; the function itself enforces admin.

-- Ensure authenticated can still call the RPCs the app uses
GRANT EXECUTE ON FUNCTION public.create_topic(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_bot_opinion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_opinion_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_readonly_chat_messages(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_topics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_joined_topic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_topic(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_content(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_opinion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_soft_delete(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_court_case_decision(uuid, text, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_topic_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_bot_opinion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_court_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_court_case(uuid, text, text) TO authenticated;
