-- 1. Append-only rating history
CREATE TABLE public.rating_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('understanding','difference')),
  target_opinion_id uuid NOT NULL REFERENCES public.opinions(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rating_events TO authenticated;
GRANT ALL ON public.rating_events TO service_role;

ALTER TABLE public.rating_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own rating events"
  ON public.rating_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users read their own rating events"
  ON public.rating_events FOR SELECT TO authenticated
  USING (auth.uid() = rater_id);

CREATE INDEX rating_events_lookup_idx
  ON public.rating_events (topic_id, rater_id, kind, target_opinion_id, created_at);

-- 2. Backfill understanding events from chat_ratings (old 0-10 scale -> 0-100)
INSERT INTO public.rating_events (topic_id, rater_id, kind, target_opinion_id, chat_id, value, created_at)
SELECT c.topic_id, cr.rater_id, 'understanding', tgt.id, c.id, cr.empathy * 10, cr.created_at
FROM public.chat_ratings cr
JOIN public.chats c ON c.id = cr.chat_id
JOIN public.opinions ro ON ro.topic_id = c.topic_id AND ro.user_id = cr.rater_id
  AND ro.id IN (c.opinion_a_id, c.opinion_b_id)
JOIN public.opinions tgt ON tgt.id = CASE WHEN ro.id = c.opinion_a_id THEN c.opinion_b_id ELSE c.opinion_a_id END;

-- 3. Backfill difference events from opinion_ratings
INSERT INTO public.rating_events (topic_id, rater_id, kind, target_opinion_id, value, created_at)
SELECT ord.topic_id, ro.user_id, 'difference', ord.target_opinion_id, ord.disagreement, ord.created_at
FROM public.opinion_ratings ord
JOIN public.opinions ro ON ro.id = ord.rater_opinion_id
WHERE ro.user_id IS NOT NULL;

-- 4. Understanding is now stored 0-100
ALTER TABLE public.chat_ratings DROP CONSTRAINT chat_ratings_empathy_range;
UPDATE public.chat_ratings SET empathy = empathy * 10;
ALTER TABLE public.chat_ratings ADD CONSTRAINT chat_ratings_empathy_range CHECK (empathy >= 0 AND empathy <= 100);

-- 5. Time-weighted effective ratings
CREATE OR REPLACE FUNCTION public.get_time_weighted_ratings(_topic_id uuid)
RETURNS TABLE(rater_id uuid, kind text, target_opinion_id uuid, value numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH cutoff AS (
    SELECT LEAST(
      now(),
      COALESCE(
        NULLIF((SELECT s.value FROM public.app_settings s WHERE s.key = 'discussion_end_at'), '')::timestamptz,
        now() + interval '100 years'
      )
    ) AS ts
  ),
  ev AS (
    SELECT e.rater_id, e.kind, e.target_opinion_id, e.value, e.created_at,
           LEAD(e.created_at) OVER (
             PARTITION BY e.rater_id, e.kind, e.target_opinion_id ORDER BY e.created_at
           ) AS next_at
    FROM public.rating_events e
    WHERE e.topic_id = _topic_id
  ),
  w AS (
    SELECT ev.rater_id, ev.kind, ev.target_opinion_id, ev.value,
           GREATEST(
             EXTRACT(epoch FROM (
               LEAST(COALESCE(ev.next_at, (SELECT ts FROM cutoff)), (SELECT ts FROM cutoff)) - ev.created_at
             )),
             60
           ) AS secs
    FROM ev
    WHERE ev.created_at <= (SELECT ts FROM cutoff)
  )
  SELECT w.rater_id, w.kind, w.target_opinion_id, SUM(w.value * w.secs) / SUM(w.secs)
  FROM w
  GROUP BY w.rater_id, w.kind, w.target_opinion_id;
$function$;

REVOKE ALL ON FUNCTION public.get_time_weighted_ratings(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_time_weighted_ratings(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_time_weighted_ratings(uuid) FROM authenticated;

-- 6. Directed pairs now use time-weighted values (empathy normalized back to 0-10)
DROP FUNCTION IF EXISTS public.get_topic_directed_pairs(uuid);
CREATE FUNCTION public.get_topic_directed_pairs(_topic_id uuid)
RETURNS TABLE(rater_opinion_id uuid, target_opinion_id uuid, empathy numeric, disagreement numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH tw AS (
    SELECT * FROM public.get_time_weighted_ratings(_topic_id)
  ),
  pairs AS (
    SELECT DISTINCT ro.id AS rater_opinion_id, tgt.id AS target_opinion_id, cr.rater_id
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
  )
  SELECT
    p.rater_opinion_id,
    p.target_opinion_id,
    COALESCE(u.value, 0) / 10.0 AS empathy,
    COALESCE(
      d.value,
      (
        SELECT ord.disagreement
        FROM public.opinion_ratings ord
        WHERE ord.topic_id = _topic_id
          AND ord.rater_opinion_id = p.rater_opinion_id
          AND ord.target_opinion_id = p.target_opinion_id
        LIMIT 1
      ),
      5
    ) AS disagreement
  FROM pairs p
  LEFT JOIN tw u
    ON u.rater_id = p.rater_id AND u.kind = 'understanding' AND u.target_opinion_id = p.target_opinion_id
  LEFT JOIN tw d
    ON d.rater_id = p.rater_id AND d.kind = 'difference' AND d.target_opinion_id = p.target_opinion_id
  ORDER BY p.rater_opinion_id, p.target_opinion_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_topic_directed_pairs(uuid) TO authenticated, anon;

-- 7. Graph pairs: time-weighted understanding (0-10 scale for edge styling)
CREATE OR REPLACE FUNCTION public.get_graph_pairs(topic_uuid uuid)
RETURNS TABLE(opinion_a_id uuid, opinion_b_id uuid, avg_empathy numeric, avg_disagreement numeric, rating_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH tw AS (
    SELECT * FROM public.get_time_weighted_ratings(topic_uuid)
    WHERE kind = 'understanding'
  )
  SELECT
    c.opinion_a_id,
    c.opinion_b_id,
    COALESCE((
      SELECT AVG(t.value) / 10.0
      FROM tw t
      JOIN public.opinions o ON o.id = c.opinion_a_id OR o.id = c.opinion_b_id
      WHERE t.rater_id = o.user_id
        AND t.target_opinion_id = CASE WHEN o.id = c.opinion_a_id THEN c.opinion_b_id ELSE c.opinion_a_id END
    ), 0) AS avg_empathy,
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
    (SELECT COUNT(*) FROM public.chat_ratings r WHERE r.chat_id = c.id) AS rating_count
  FROM public.chats c
  WHERE c.topic_id = topic_uuid
    AND EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = c.opinion_a_id AND COALESCE(o.visible, true) = true
    )
    AND EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = c.opinion_b_id AND COALESCE(o.visible, true) = true
    );
$function$;

GRANT EXECUTE ON FUNCTION public.get_graph_pairs(uuid) TO authenticated, anon;