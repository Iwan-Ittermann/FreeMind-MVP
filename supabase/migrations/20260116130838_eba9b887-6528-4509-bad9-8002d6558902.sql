-- Drop and recreate the contents view with admin-only access
-- Views can use security_invoker to respect RLS of underlying tables
-- But since we want admin-only access to the unified view, we'll use a function approach

DROP VIEW IF EXISTS public.contents;

-- Create the view with security_invoker = true so it respects caller's permissions
CREATE VIEW public.contents 
WITH (security_invoker = true)
AS
SELECT 
  o.topic_id,
  o.id as content_id,
  o.user_id as creator_id,
  o.created_at,
  o.visible,
  o.text,
  o.notice_text,
  'Opinion'::text as content_type,
  o.status
FROM public.opinions o
WHERE public.has_role(auth.uid(), 'admin')
UNION ALL
SELECT 
  c.topic_id,
  cm.id as content_id,
  cm.sender_id as creator_id,
  cm.created_at,
  cm.visible,
  cm.content as text,
  cm.notice_text,
  'ChatMessage'::text as content_type,
  cm.status
FROM public.chat_messages cm
JOIN public.chats c ON cm.chat_id = c.id
WHERE public.has_role(auth.uid(), 'admin');