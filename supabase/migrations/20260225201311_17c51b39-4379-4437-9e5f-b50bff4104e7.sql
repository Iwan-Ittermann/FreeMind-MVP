
-- 1. SECURITY DEFINER function: upsert_bot_opinion
-- Allows admin to create/update the bot's opinion row
CREATE OR REPLACE FUNCTION public.upsert_bot_opinion(_topic_id uuid, _text text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _opinion_id uuid;
  _bot_user_id uuid := '00000000-0000-0000-0000-0000000000a1';
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Try to find existing bot opinion for this topic
  SELECT id INTO _opinion_id
  FROM public.opinions
  WHERE user_id = _bot_user_id AND topic_id = _topic_id;

  IF _opinion_id IS NOT NULL THEN
    UPDATE public.opinions SET text = _text WHERE id = _opinion_id;
  ELSE
    INSERT INTO public.opinions (topic_id, user_id, text, visible, status)
    VALUES (_topic_id, _bot_user_id, _text, true, 'Visible')
    RETURNING id INTO _opinion_id;
  END IF;

  RETURN _opinion_id;
END;
$function$;

-- 2. SECURITY DEFINER function: delete_bot_opinion
CREATE OR REPLACE FUNCTION public.delete_bot_opinion(_topic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _bot_user_id uuid := '00000000-0000-0000-0000-0000000000a1';
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.opinions WHERE user_id = _bot_user_id AND topic_id = _topic_id;
END;
$function$;

-- 3. SECURITY DEFINER function: insert_bot_message
-- Used by edge function (via service role) to insert messages as the bot
CREATE OR REPLACE FUNCTION public.insert_bot_message(_chat_id uuid, _content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _msg_id uuid;
  _bot_user_id uuid := '00000000-0000-0000-0000-0000000000a1';
BEGIN
  INSERT INTO public.chat_messages (chat_id, sender_id, content)
  VALUES (_chat_id, _bot_user_id, _content)
  RETURNING id INTO _msg_id;

  RETURN _msg_id;
END;
$function$;

-- 4. Trigger function: auto-accept chat requests targeting the bot
CREATE OR REPLACE FUNCTION public.auto_accept_bot_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _bot_user_id uuid := '00000000-0000-0000-0000-0000000000a1';
  _target_owner uuid;
BEGIN
  -- Check if the target opinion belongs to the bot
  SELECT user_id INTO _target_owner
  FROM public.opinions
  WHERE id = NEW.target_opinion_id;

  IF _target_owner = _bot_user_id THEN
    NEW.status := 'accepted';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_accept_bot_requests
  BEFORE INSERT ON public.chat_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_bot_requests();

-- 5. Update get_or_create_chat to allow bot as participant
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

  -- Allow if current user owns one opinion OR one participant is the bot
  IF NOT (_a_owner = _uid OR _b_owner = _uid OR _a_owner = _bot_user_id OR _b_owner = _bot_user_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Reuse existing chat regardless of (a,b) ordering
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

-- 6. Update is_chat_participant to recognize the bot
CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_id uuid, checking_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.opinions oa ON c.opinion_a_id = oa.id
    JOIN public.opinions ob ON c.opinion_b_id = ob.id
    WHERE c.id = chat_id
    AND (oa.user_id = checking_user_id OR ob.user_id = checking_user_id
         OR oa.user_id = '00000000-0000-0000-0000-0000000000a1'
         OR ob.user_id = '00000000-0000-0000-0000-0000000000a1')
  )
$function$;
