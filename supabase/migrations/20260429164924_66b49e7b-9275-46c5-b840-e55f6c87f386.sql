CREATE OR REPLACE FUNCTION public.get_readonly_chat_messages(_source_opinion_id uuid, _target_opinion_id uuid)
RETURNS TABLE (
  chat_id uuid,
  id uuid,
  sender_id uuid,
  content text,
  created_at timestamptz,
  reply_to_id uuid,
  audio_url text,
  transcript text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS chat_id,
    m.id,
    m.sender_id,
    m.content,
    m.created_at,
    m.reply_to_id,
    m.audio_url,
    m.transcript
  FROM public.chats c
  JOIN public.chat_requests cr
    ON cr.topic_id = c.topic_id
   AND cr.status = 'accepted'
   AND (
     (cr.requester_opinion_id = c.opinion_a_id AND cr.target_opinion_id = c.opinion_b_id)
     OR
     (cr.requester_opinion_id = c.opinion_b_id AND cr.target_opinion_id = c.opinion_a_id)
   )
  LEFT JOIN public.chat_messages m
    ON m.chat_id = c.id
   AND COALESCE(m.visible, true) = true
  WHERE (
      (c.opinion_a_id = _source_opinion_id AND c.opinion_b_id = _target_opinion_id)
      OR
      (c.opinion_a_id = _target_opinion_id AND c.opinion_b_id = _source_opinion_id)
    )
    AND EXISTS (
      SELECT 1
      FROM public.opinions o
      WHERE o.id = _source_opinion_id
        AND o.topic_id = c.topic_id
        AND COALESCE(o.visible, true) = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.opinions o
      WHERE o.id = _target_opinion_id
        AND o.topic_id = c.topic_id
        AND COALESCE(o.visible, true) = true
    )
  ORDER BY m.created_at ASC;
$$;