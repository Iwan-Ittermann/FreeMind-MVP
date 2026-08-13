ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS title text;

CREATE OR REPLACE FUNCTION public.get_topic_directed_pairs(_topic_id uuid)
RETURNS TABLE(rater_opinion_id uuid, target_opinion_id uuid, empathy integer, disagreement integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ro.id AS rater_opinion_id,
    tgt.id AS target_opinion_id,
    cr.empathy::int AS empathy,
    COALESCE(
      (
        SELECT ord.disagreement
        FROM public.opinion_ratings ord
        WHERE ord.topic_id = _topic_id
          AND ord.rater_opinion_id = ro.id
          AND ord.target_opinion_id = tgt.id
        LIMIT 1
      ),
      cr.disagreement,
      50
    )::int AS disagreement
  FROM public.chat_ratings cr
  JOIN public.chats c ON c.id = cr.chat_id AND c.topic_id = _topic_id
  JOIN public.opinions ro
    ON ro.topic_id = _topic_id
   AND ro.user_id = cr.rater_id
   AND ro.id IN (c.opinion_a_id, c.opinion_b_id)
   AND COALESCE(ro.visible, true) = true
  JOIN public.opinions tgt
    ON tgt.id = CASE WHEN ro.id = c.opinion_a_id THEN c.opinion_b_id ELSE c.opinion_a_id END
   AND COALESCE(tgt.visible, true) = true
  ORDER BY ro.id, tgt.id;
$$;

REVOKE ALL ON FUNCTION public.get_topic_directed_pairs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_topic_directed_pairs(uuid) TO anon, authenticated, service_role;