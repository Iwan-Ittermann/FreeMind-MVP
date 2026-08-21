REVOKE ALL ON FUNCTION public.notify_on_new_opinion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_new_chat() FROM PUBLIC, anon, authenticated;