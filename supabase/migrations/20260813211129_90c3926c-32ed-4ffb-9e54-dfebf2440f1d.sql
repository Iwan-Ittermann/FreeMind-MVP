-- 1. Convert existing data to the new 0-10 scales
ALTER TABLE public.chat_ratings DROP CONSTRAINT IF EXISTS chat_ratings_empathy_range;
ALTER TABLE public.chat_ratings DROP CONSTRAINT IF EXISTS chat_ratings_disagreement_range;

UPDATE public.chat_ratings
SET empathy = round(greatest(empathy, 0) / 5.0)::int,
    disagreement = round(disagreement / 10.0)::int;

UPDATE public.opinion_ratings
SET disagreement = round(disagreement / 10.0)::int;

ALTER TABLE public.chat_ratings
  ADD CONSTRAINT chat_ratings_empathy_range CHECK (empathy >= 0 AND empathy <= 10);
ALTER TABLE public.chat_ratings
  ADD CONSTRAINT chat_ratings_disagreement_range CHECK (disagreement >= 0 AND disagreement <= 10);

ALTER TABLE public.opinion_ratings ALTER COLUMN disagreement SET DEFAULT 5;
ALTER TABLE public.opinion_ratings DROP CONSTRAINT IF EXISTS opinion_ratings_disagreement_range;
ALTER TABLE public.opinion_ratings
  ADD CONSTRAINT opinion_ratings_disagreement_range CHECK (disagreement >= 0 AND disagreement <= 10);

-- 2. Update fallbacks in graph functions (50 -> 5)
CREATE OR REPLACE FUNCTION public.get_graph_pairs(topic_uuid uuid)
 RETURNS TABLE(opinion_a_id uuid, opinion_b_id uuid, avg_empathy numeric, avg_disagreement numeric, rating_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
      5
    ) AS avg_disagreement,
    COUNT(r.id) AS rating_count
  FROM public.chats c
  LEFT JOIN public.chat_ratings r ON r.chat_id = c.id
  WHERE c.topic_id = topic_uuid
    AND EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = c.opinion_a_id AND COALESCE(o.visible, true) = true
    )
    AND EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = c.opinion_b_id AND COALESCE(o.visible, true) = true
    )
  GROUP BY c.id, c.opinion_a_id, c.opinion_b_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_topic_directed_pairs(_topic_id uuid)
 RETURNS TABLE(rater_opinion_id uuid, target_opinion_id uuid, empathy integer, disagreement integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      5
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
$function$;