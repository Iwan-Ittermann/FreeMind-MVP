REVOKE ALL ON FUNCTION public.get_readonly_chat_messages(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_readonly_chat_messages(uuid, uuid) TO authenticated;