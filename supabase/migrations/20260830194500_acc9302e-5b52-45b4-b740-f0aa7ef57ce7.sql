-- 1) Snapshot table for the finished August standing
CREATE TABLE public.archive_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  opinion_id uuid NOT NULL,
  author_id uuid,
  opinion_text text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  rank integer NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.archive_results TO anon;
GRANT SELECT ON public.archive_results TO authenticated;
GRANT ALL ON public.archive_results TO service_role;

ALTER TABLE public.archive_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read archive results"
ON public.archive_results FOR SELECT
USING (true);

-- 2) One-shot capture of the current August standing
WITH topic AS (
  SELECT t.id FROM public.topics t
  WHERE t.short_code = public.event_setting('archive_topic_short_code')
  LIMIT 1
),
pts AS (
  SELECT d.target_opinion_id AS opinion_id,
         SUM(COALESCE(d.empathy, 0) * COALESCE(d.disagreement, 0)) AS points
  FROM topic, public.get_topic_directed_pairs((SELECT id FROM topic)) d
  GROUP BY d.target_opinion_id
),
ranked AS (
  SELECT o.id AS opinion_id,
         o.user_id AS author_id,
         o.text AS opinion_text,
         COALESCE(p.points, 0) AS points,
         ROW_NUMBER() OVER (ORDER BY COALESCE(p.points, 0) DESC, o.id) AS rnk
  FROM public.opinions o
  LEFT JOIN pts p ON p.opinion_id = o.id
  WHERE o.topic_id = (SELECT id FROM topic)
    AND COALESCE(o.visible, true) = true
)
INSERT INTO public.archive_results (topic_id, opinion_id, author_id, opinion_text, points, rank)
SELECT (SELECT id FROM topic), r.opinion_id, r.author_id, r.opinion_text, r.points, r.rnk
FROM ranked r;

-- 3) Unfreeze: drop the post-reopen cutoff from the write policies
DROP POLICY IF EXISTS "Users can insert own opinion ratings" ON public.opinion_ratings;
CREATE POLICY "Users can insert own opinion ratings"
ON public.opinion_ratings FOR INSERT TO authenticated
WITH CHECK (
  (public.is_open_topic(topic_id) OR ((NOT public.is_archived_topic(topic_id)) AND public.is_verified_participant(auth.uid())))
  AND EXISTS (SELECT 1 FROM public.opinions o WHERE o.id = rater_opinion_id AND o.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create chat requests for own opinions" ON public.chat_requests;
CREATE POLICY "Users can create chat requests for own opinions"
ON public.chat_requests FOR INSERT TO authenticated
WITH CHECK (
  (public.is_open_topic(topic_id) OR ((NOT public.is_archived_topic(topic_id)) AND public.is_verified_participant(auth.uid())))
  AND EXISTS (SELECT 1 FROM public.opinions o WHERE o.id = requester_opinion_id AND o.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_messages.chat_id
      AND (public.is_open_topic(c.topic_id) OR ((NOT public.is_archived_topic(c.topic_id)) AND public.is_verified_participant(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Chat participants can rate" ON public.chat_ratings;
CREATE POLICY "Chat participants can rate"
ON public.chat_ratings FOR INSERT TO authenticated
WITH CHECK (
  public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_ratings.chat_id
      AND (public.is_open_topic(c.topic_id) OR ((NOT public.is_archived_topic(c.topic_id)) AND public.is_verified_participant(auth.uid())))
  )
);

-- 4) Unfreeze the RPCs
CREATE OR REPLACE FUNCTION public.submit_opinion(_topic_id uuid, _text text, _ip_address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _opinion_id uuid;
  _uid uuid;
  _open timestamptz;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_archived_topic(_topic_id) AND NOT public.is_open_topic(_topic_id) THEN
    RAISE EXCEPTION 'This discussion is archived' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_open_topic(_topic_id) AND NOT public.is_verified_participant(_uid) THEN
    RAISE EXCEPTION 'Not verified: email confirmation required' USING ERRCODE = '42501';
  END IF;

  IF public.is_real_event_topic(_topic_id) AND NOT public.is_open_topic(_topic_id) THEN
    _open := public.event_setting('opinions_open_at')::timestamptz;
    IF _open IS NOT NULL AND now() < _open THEN
      RAISE EXCEPTION 'Submission window not open yet' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.opinions (topic_id, user_id, text)
  VALUES (_topic_id, _uid, _text)
  RETURNING id INTO _opinion_id;

  IF _ip_address IS NOT NULL THEN
    INSERT INTO public.opinion_ips (opinion_id, ip_address)
    VALUES (_opinion_id, _ip_address)
    ON CONFLICT (opinion_id) DO UPDATE SET ip_address = EXCLUDED.ip_address;
  END IF;

  RETURN _opinion_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_chat(topic_uuid uuid, opinion_a_uuid uuid, opinion_b_uuid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _chat_id uuid;
  _a_owner uuid;
  _b_owner uuid;
  _a_topic uuid;
  _b_topic uuid;
  _bot_user_id uuid := '00000000-0000-0000-0000-0000000000a1';
  _open timestamptz;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT user_id, topic_id INTO _a_owner, _a_topic FROM public.opinions WHERE id = opinion_a_uuid;
  IF _a_owner IS NULL THEN RAISE EXCEPTION 'opinion_a not found'; END IF;

  SELECT user_id, topic_id INTO _b_owner, _b_topic FROM public.opinions WHERE id = opinion_b_uuid;
  IF _b_owner IS NULL THEN RAISE EXCEPTION 'opinion_b not found'; END IF;

  IF _a_topic <> topic_uuid OR _b_topic <> topic_uuid THEN
    RAISE EXCEPTION 'opinions not in topic';
  END IF;

  IF NOT (_a_owner = _uid OR _b_owner = _uid OR _a_owner = _bot_user_id OR _b_owner = _bot_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT c.id INTO _chat_id
  FROM public.chats c
  WHERE c.topic_id = topic_uuid
    AND (
      (c.opinion_a_id = opinion_a_uuid AND c.opinion_b_id = opinion_b_uuid)
      OR (c.opinion_a_id = opinion_b_uuid AND c.opinion_b_id = opinion_a_uuid)
    )
  LIMIT 1;

  IF _chat_id IS NOT NULL THEN
    RETURN _chat_id;
  END IF;

  IF public.is_archived_topic(topic_uuid) AND NOT public.is_open_topic(topic_uuid) THEN
    RAISE EXCEPTION 'This discussion is archived' USING ERRCODE = '42501';
  END IF;

  IF public.is_real_event_topic(topic_uuid) AND NOT public.is_open_topic(topic_uuid) THEN
    _open := public.event_setting('discussion_open_at')::timestamptz;
    IF _open IS NOT NULL AND now() < _open THEN
      RAISE EXCEPTION 'Discussion has not started yet' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.chats (topic_id, opinion_a_id, opinion_b_id)
  VALUES (topic_uuid, opinion_a_uuid, opinion_b_uuid)
  RETURNING id INTO _chat_id;

  RETURN _chat_id;
END;
$function$;

-- 5) Let users delete their own opinion in an open discussion
CREATE OR REPLACE FUNCTION public.delete_my_opinion(_topic_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _ids uuid[];
  _oid uuid;
  _count integer := 0;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_open_topic(_topic_id) THEN
    RAISE EXCEPTION 'Not allowed in this discussion' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(id) INTO _ids
  FROM public.opinions
  WHERE topic_id = _topic_id AND user_id = _uid;

  IF _ids IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH _oid IN ARRAY _ids LOOP
    DELETE FROM public.chat_ratings
    WHERE chat_id IN (SELECT id FROM public.chats WHERE opinion_a_id = _oid OR opinion_b_id = _oid);

    DELETE FROM public.chat_messages
    WHERE chat_id IN (SELECT id FROM public.chats WHERE opinion_a_id = _oid OR opinion_b_id = _oid);

    DELETE FROM public.rating_events
    WHERE target_opinion_id = _oid
       OR chat_id IN (SELECT id FROM public.chats WHERE opinion_a_id = _oid OR opinion_b_id = _oid);

    UPDATE public.notifications SET chat_id = NULL
    WHERE chat_id IN (SELECT id FROM public.chats WHERE opinion_a_id = _oid OR opinion_b_id = _oid);

    UPDATE public.user_blocks SET chat_id = NULL
    WHERE chat_id IN (SELECT id FROM public.chats WHERE opinion_a_id = _oid OR opinion_b_id = _oid);

    DELETE FROM public.chats WHERE opinion_a_id = _oid OR opinion_b_id = _oid;

    DELETE FROM public.chat_requests
    WHERE requester_opinion_id = _oid OR target_opinion_id = _oid;

    DELETE FROM public.opinion_ratings
    WHERE rater_opinion_id = _oid OR target_opinion_id = _oid;

    DELETE FROM public.opinion_ips WHERE opinion_id = _oid;

    DELETE FROM public.opinions WHERE id = _oid AND user_id = _uid;
    _count := _count + 1;

    PERFORM public.log_audit('delete_my_opinion', 'opinions', _oid,
      jsonb_build_object('topic_id', _topic_id));
  END LOOP;

  RETURN _count;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_my_opinion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_opinion(uuid) TO authenticated;