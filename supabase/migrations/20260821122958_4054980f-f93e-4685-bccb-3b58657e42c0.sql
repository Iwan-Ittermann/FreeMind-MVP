CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_id uuid,
  chat_id uuid,
  opinion_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notifications readable" ON public.notifications;
CREATE POLICY "own notifications readable" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own notifications updatable" ON public.notifications;
CREATE POLICY "own notifications updatable" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Mark all as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;

-- Trigger: new opinion -> notify other participants of the topic
CREATE OR REPLACE FUNCTION public.notify_on_new_opinion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS notify_on_new_opinion ON public.opinions;
CREATE TRIGGER notify_on_new_opinion
AFTER INSERT ON public.opinions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_opinion();

-- Trigger: new chat message -> notify the counterpart
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

  INSERT INTO public.notifications (user_id, topic_id, chat_id, type, title, body, link)
  VALUES (v_recipient, v_topic, NEW.chat_id, 'message', 'Neue Nachricht',
          left(coalesce(NEW.content, ''), 120), '/go');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_new_message ON public.chat_messages;
CREATE TRIGGER notify_on_new_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- Trigger: new chat -> notify the invited counterpart
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

  IF v_b IS NOT NULL AND v_b <> coalesce(v_a, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, topic_id, chat_id, type, title, body, link)
    VALUES (v_b, NEW.topic_id, NEW.id, 'chat_request', 'Neues Gespräch', NULL, '/go');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_new_chat ON public.chats;
CREATE TRIGGER notify_on_new_chat
AFTER INSERT ON public.chats
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat();