GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_opinion(uuid, boolean, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_setting(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_real_event_topic(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fake_node_user_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_participant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_time_weighted_ratings(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;