CREATE OR REPLACE FUNCTION public.event_setting(_key text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT nullif(value, '') FROM public.app_settings WHERE key = _key LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.event_setting(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.is_real_event_topic(_topic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.topics t
    WHERE t.id = _topic_id
      AND t.short_code = public.event_setting('real_topic_short_code')
  )
$$;

REVOKE ALL ON FUNCTION public.is_real_event_topic(uuid) FROM PUBLIC;

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

  IF NOT public.is_verified_participant(_uid) THEN
    RAISE EXCEPTION 'Not verified: email confirmation required' USING ERRCODE = '42501';
  END IF;

  -- Time gate: applies only to the real event topic
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

  -- Time gate: applies only to the real event topic
  IF public.is_real_event_topic(topic_uuid) THEN
    _open := public.event_setting('discussion_open_at')::timestamptz;
    IF _open IS NOT NULL AND now() < _open THEN
      RAISE EXCEPTION 'Discussion has not started yet' USING ERRCODE = '42501';
    END IF;
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

  INSERT INTO public.chats (topic_id, opinion_a_id, opinion_b_id)
  VALUES (topic_uuid, opinion_a_uuid, opinion_b_uuid)
  RETURNING id INTO _chat_id;

  RETURN _chat_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_opinion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat(uuid, uuid, uuid) TO authenticated;