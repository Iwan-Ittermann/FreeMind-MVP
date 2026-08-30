-- 1. Settings: archive is now open, with a freeze line
INSERT INTO public.app_settings (key, value) VALUES ('archive_open', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now();
INSERT INTO public.app_settings (key, value) VALUES ('archive_reopened_at', now()::text)
ON CONFLICT (key) DO UPDATE SET value = now()::text, updated_at = now();

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.is_open_topic(_topic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_sandbox_topic(_topic_id)
     OR (public.is_archived_topic(_topic_id)
         AND lower(coalesce(public.event_setting('archive_open'), '')) = 'true');
$$;

CREATE OR REPLACE FUNCTION public.archive_reopened_at()
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT nullif(public.event_setting('archive_reopened_at'), '')::timestamptz;
$$;

-- true when the opinion may be interacted with (non-archive topics: always)
CREATE OR REPLACE FUNCTION public.is_post_reopen_opinion(_opinion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT NOT public.is_archived_topic(o.topic_id)
        OR o.user_id IN (
             '00000000-0000-0000-0000-0000000000a1'::uuid,
             '00000000-0000-0000-0000-0000000000b1'::uuid,
             '00000000-0000-0000-0000-0000000000b2'::uuid,
             '00000000-0000-0000-0000-0000000000b3'::uuid)
        OR (public.archive_reopened_at() IS NOT NULL
            AND o.created_at >= public.archive_reopened_at())
    FROM public.opinions o WHERE o.id = _opinion_id
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.is_post_reopen_chat(_chat_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((
    SELECT NOT public.is_archived_topic(c.topic_id)
        OR (public.archive_reopened_at() IS NOT NULL
            AND c.created_at >= public.archive_reopened_at())
    FROM public.chats c WHERE c.id = _chat_id
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_open_topic(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_reopened_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_post_reopen_opinion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_post_reopen_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_open_topic(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_reopened_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_post_reopen_opinion(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_post_reopen_chat(uuid) TO authenticated, service_role;

-- 3. Write policies: open topics may be written to, archive history stays frozen
DROP POLICY IF EXISTS "Users can insert own opinions" ON public.opinions;
CREATE POLICY "Users can insert own opinions" ON public.opinions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.is_open_topic(topic_id)
    OR (NOT public.is_archived_topic(topic_id) AND public.is_verified_participant(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can insert own opinion ratings" ON public.opinion_ratings;
CREATE POLICY "Users can insert own opinion ratings" ON public.opinion_ratings FOR INSERT TO authenticated
WITH CHECK (
  (
    public.is_open_topic(topic_id)
    OR (NOT public.is_archived_topic(topic_id) AND public.is_verified_participant(auth.uid()))
  )
  AND public.is_post_reopen_opinion(target_opinion_id)
  AND EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = opinion_ratings.rater_opinion_id AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create chat requests for own opinions" ON public.chat_requests;
CREATE POLICY "Users can create chat requests for own opinions" ON public.chat_requests FOR INSERT TO authenticated
WITH CHECK (
  (
    public.is_open_topic(topic_id)
    OR (NOT public.is_archived_topic(topic_id) AND public.is_verified_participant(auth.uid()))
  )
  AND public.is_post_reopen_opinion(target_opinion_id)
  AND EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = chat_requests.requester_opinion_id AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_chat_participant(chat_id, auth.uid())
  AND public.is_post_reopen_chat(chat_id)
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_messages.chat_id
      AND (
        public.is_open_topic(c.topic_id)
        OR (NOT public.is_archived_topic(c.topic_id) AND public.is_verified_participant(auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS "Chat participants can rate" ON public.chat_ratings;
CREATE POLICY "Chat participants can rate" ON public.chat_ratings FOR INSERT TO authenticated
WITH CHECK (
  public.is_chat_participant(chat_id, auth.uid())
  AND public.is_post_reopen_chat(chat_id)
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_ratings.chat_id
      AND (
        public.is_open_topic(c.topic_id)
        OR (NOT public.is_archived_topic(c.topic_id) AND public.is_verified_participant(auth.uid()))
      )
  )
);

-- 4. submit_opinion: allow the reopened archive
CREATE OR REPLACE FUNCTION public.submit_opinion(_topic_id uuid, _text text, _ip_address text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

  IF public.is_real_event_topic(_topic_id) THEN
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

-- 5. get_or_create_chat: new chats in the reopened archive only between post-reopen opinions
CREATE OR REPLACE FUNCTION public.get_or_create_chat(topic_uuid uuid, opinion_a_uuid uuid, opinion_b_uuid uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

  IF public.is_archived_topic(topic_uuid) THEN
    IF NOT public.is_open_topic(topic_uuid) THEN
      RAISE EXCEPTION 'This discussion is archived' USING ERRCODE = '42501';
    END IF;
    IF NOT (public.is_post_reopen_opinion(opinion_a_uuid) AND public.is_post_reopen_opinion(opinion_b_uuid)) THEN
      RAISE EXCEPTION 'This opinion is part of the finished August discussion' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF public.is_real_event_topic(topic_uuid) THEN
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