CREATE OR REPLACE FUNCTION public.get_graph_pairs(topic_uuid uuid)
RETURNS TABLE(opinion_a_id uuid, opinion_b_id uuid, avg_empathy numeric, avg_disagreement numeric, rating_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.opinion_a_id,
    c.opinion_b_id,
    COALESCE(AVG(r.empathy), 0) AS avg_empathy,
    COALESCE(
      (
        SELECT AVG(ord.disagreement)::numeric
        FROM public.opinion_ratings ord
        WHERE ord.topic_id = topic_uuid
          AND (
            (ord.rater_opinion_id = c.opinion_a_id AND ord.target_opinion_id = c.opinion_b_id)
            OR
            (ord.rater_opinion_id = c.opinion_b_id AND ord.target_opinion_id = c.opinion_a_id)
          )
      ),
      50
    ) AS avg_disagreement,
    COUNT(r.id) AS rating_count
  FROM public.chats c
  LEFT JOIN public.chat_ratings r ON r.chat_id = c.id
  WHERE c.topic_id = topic_uuid
    AND EXISTS (
      SELECT 1
      FROM public.opinions o
      WHERE o.id = c.opinion_a_id
        AND COALESCE(o.visible, true) = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.opinions o
      WHERE o.id = c.opinion_b_id
        AND COALESCE(o.visible, true) = true
    )
  GROUP BY c.id, c.opinion_a_id, c.opinion_b_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_readonly_chat_messages(_source_opinion_id uuid, _target_opinion_id uuid)
RETURNS TABLE(chat_id uuid, id uuid, sender_id uuid, content text, created_at timestamp with time zone, reply_to_id uuid, audio_url text, transcript text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;