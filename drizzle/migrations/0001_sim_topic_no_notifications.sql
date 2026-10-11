-- The permanent /sim replay writes into the normal discussion tables.
-- It must never create notifications (bell panel, pushes, digest).

-- Helper: is this topic the simulation topic (app_settings sim_topic_short_code)?
CREATE OR REPLACE FUNCTION public.is_sim_topic(v_topic uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.topics t
    JOIN public.app_settings s ON s.key = 'sim_topic_short_code'
    WHERE t.id = v_topic
      AND t.short_code = btrim(s.value)
  );
$$;

REVOKE ALL ON FUNCTION public.is_sim_topic(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sim_topic(uuid) TO anon, authenticated, service_role;

-- New opinion in the sim topic: skip.
CREATE OR REPLACE FUNCTION public.notify_on_new_opinion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.topic_id IS NOT NULL AND public.is_sim_topic(NEW.topic_id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, topic_id, opinion_id, type, title, body, link)
  SELECT DISTINCT o.user_id, NEW.topic_id, NEW.id, 'opinion',
         'Neue Meinung', left(coalesce(NEW.text, ''), 120), '/go'
    FROM public.opinions o
   WHERE o.topic_id = NEW.topic_id
     AND o.user_id IS NOT NULL
     AND o.user_id <> NEW.user_id
     AND coalesce(o.visible, true);
  RETURN NEW;
END;
$$;

-- New chat message inside the sim topic: skip.
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic uuid;
  v_recipient uuid;
BEGIN
  SELECT c.topic_id,
         CASE WHEN oa.user_id = NEW.sender_id THEN ob.user_id ELSE oa.user_id END
    INTO v_topic, v_recipient
    FROM public.chats c
    JOIN public.opinions oa ON oa.id = c.opinion_a_id
    JOIN public.opinions ob ON ob.id = c.opinion_b_id
   WHERE c.id = NEW.chat_id;

  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  IF v_topic IS NOT NULL AND public.is_sim_topic(v_topic) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, topic_id, chat_id, type, title, body, link)
  VALUES (v_recipient, v_topic, NEW.chat_id, 'message', 'Neue Nachricht',
          left(coalesce(NEW.content, ''), 120), '/go');
  RETURN NEW;
END;
$$;

-- New chat inside the sim topic: skip.
CREATE OR REPLACE FUNCTION public.notify_on_new_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a uuid;
  v_b uuid;
BEGIN
  SELECT oa.user_id, ob.user_id INTO v_a, v_b
    FROM public.opinions oa, public.opinions ob
   WHERE oa.id = NEW.opinion_a_id AND ob.id = NEW.opinion_b_id;

  IF NEW.topic_id IS NOT NULL AND public.is_sim_topic(NEW.topic_id) THEN
    RETURN NEW;
  END IF;

  IF v_b IS NOT NULL AND v_b <> coalesce(v_a, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, topic_id, chat_id, type, title, body, link)
    VALUES (v_b, NEW.topic_id, NEW.id, 'chat_request', 'Neues Gespräch', NULL, '/go');
  END IF;
  RETURN NEW;
END;
$$;

-- Bridge points for a sim participant: skip.
CREATE OR REPLACE FUNCTION public.notify_on_bridge_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_diff numeric;
  v_points integer;
BEGIN
  IF NEW.kind <> 'understanding' THEN
    RETURN NEW;
  END IF;

  IF NEW.topic_id IS NOT NULL AND public.is_sim_topic(NEW.topic_id) THEN
    RETURN NEW;
  END IF;

  SELECT o.user_id INTO v_owner FROM public.opinions o WHERE o.id = NEW.target_opinion_id;
  IF v_owner IS NULL OR v_owner = NEW.rater_id THEN
    RETURN NEW;
  END IF;

  SELECT e.value INTO v_diff
  FROM public.rating_events e
  WHERE e.kind = 'difference'
    AND e.rater_id = NEW.rater_id
    AND e.target_opinion_id = NEW.target_opinion_id
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_diff IS NULL THEN
    SELECT r.disagreement INTO v_diff
    FROM public.opinion_ratings r
    JOIN public.opinions ro ON ro.id = r.rater_opinion_id AND ro.user_id = NEW.rater_id
    WHERE r.target_opinion_id = NEW.target_opinion_id
    LIMIT 1;
  END IF;

  v_points := GREATEST(0, ROUND((NEW.value / 10.0) * COALESCE(v_diff, 5)))::integer;

  INSERT INTO public.notifications (user_id, topic_id, chat_id, opinion_id, type, title, body, link)
  VALUES (v_owner, NEW.topic_id, NEW.chat_id, NEW.target_opinion_id, 'bridge_points',
          'Brückenpunkte erhalten',
          'Du hast ' || v_points || ' Brückenpunkte für deine Meinung erhalten.',
          '/go');

  RETURN NEW;
END;
$function$;

-- Triggers stay attached to the replaced functions; re-declare for safety.
DROP TRIGGER IF EXISTS notify_on_new_opinion ON public.opinions;
CREATE TRIGGER notify_on_new_opinion
AFTER INSERT ON public.opinions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_opinion();

DROP TRIGGER IF EXISTS notify_on_new_message ON public.chat_messages;
CREATE TRIGGER notify_on_new_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

DROP TRIGGER IF EXISTS notify_on_new_chat ON public.chats;
CREATE TRIGGER notify_on_new_chat
AFTER INSERT ON public.chats
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat();

DROP TRIGGER IF EXISTS trg_notify_bridge_points ON public.rating_events;
CREATE TRIGGER trg_notify_bridge_points
AFTER INSERT ON public.rating_events
FOR EACH ROW EXECUTE FUNCTION public.notify_on_bridge_points();