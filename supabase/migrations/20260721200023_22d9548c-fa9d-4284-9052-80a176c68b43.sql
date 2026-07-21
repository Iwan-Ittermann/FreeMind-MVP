
CREATE OR REPLACE VIEW public.opinions_public
WITH (security_invoker = on) AS
SELECT id, topic_id, user_id, text, created_at, visible, status, notice_text
FROM public.opinions;

GRANT SELECT ON public.opinions_public TO authenticated;
GRANT SELECT ON public.opinions_public TO anon;
