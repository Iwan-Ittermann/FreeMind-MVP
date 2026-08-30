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

  SELECT user_id, topic_id INTO _a_owner, _a_topic
  FROM public.opinions WHERE id = opinion_a_uuid;
  IF _a_owner IS NULL THEN
    RAISE EXCEPTION 'opinion_a not found';
  END IF;

  SELECT user_id, topic_id INTO _b_owner, _b_topic
  FROM public.opinions WHERE id = opinion_b_uuid;
  IF _b_owner IS NULL THEN
    RAISE EXCEPTION 'opinion_b not found';
  END IF;

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
      OR
      (c.opinion_a_id = opinion_b_uuid AND c.opinion_b_id = opinion_a_uuid)
    )
  LIMIT 1;

  IF _chat_id IS NOT NULL THEN
    RETURN _chat_id;
  END IF;

  -- The archive is frozen: no new conversations there.
  IF public.is_archived_topic(topic_uuid) THEN
    RAISE EXCEPTION 'This discussion is archived' USING ERRCODE = '42501';
  END IF;

  -- Time gate: applies only to the real event topic
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