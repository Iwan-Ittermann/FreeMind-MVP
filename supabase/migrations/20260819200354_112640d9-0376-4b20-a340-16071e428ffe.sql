-- 1. Editable tutorial steps
CREATE TABLE public.tutorial_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order integer NOT NULL DEFAULT 0,
  text text NOT NULL,
  highlight text NOT NULL DEFAULT 'none',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tutorial_steps_highlight_check CHECK (highlight IN ('none','difference','chat'))
);

GRANT SELECT ON public.tutorial_steps TO anon;
GRANT SELECT ON public.tutorial_steps TO authenticated;
GRANT ALL ON public.tutorial_steps TO service_role;

ALTER TABLE public.tutorial_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tutorial steps"
  ON public.tutorial_steps FOR SELECT
  USING (true);

CREATE TRIGGER tutorial_steps_updated_at
  BEFORE UPDATE ON public.tutorial_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tutorial_steps (sort_order, text, highlight) VALUES
  (10, 'Klick auf die anderen Meinungen und bewerte deine Zustimmung oder Ablehnung!', 'difference'),
  (20, 'Jetzt kannst du mit ihnen chatten. Klick auf "Diskutieren"', 'chat');

-- 2. Repeatable respect ratings
ALTER TABLE public.chat_ratings DROP CONSTRAINT IF EXISTS chat_ratings_chat_id_rater_id_key;
ALTER TABLE public.chat_ratings ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.chat_ratings
  ADD CONSTRAINT chat_ratings_chat_rater_round_key UNIQUE (chat_id, rater_id, message_count);

-- 3. Fresh chat titles with the new naming style
UPDATE public.chats SET title = NULL;

-- 4. Read-only list of all chats in a topic
CREATE OR REPLACE FUNCTION public.get_topic_chats(_topic_id uuid)
RETURNS TABLE (
  id uuid,
  opinion_a_id uuid,
  opinion_b_id uuid,
  title text,
  opinion_a_text text,
  opinion_b_text text,
  last_message text,
  last_message_at timestamptz,
  message_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.opinion_a_id,
    c.opinion_b_id,
    c.title,
    oa.text AS opinion_a_text,
    ob.text AS opinion_b_text,
    lm.content AS last_message,
    lm.created_at AS last_message_at,
    COALESCE(mc.cnt, 0) AS message_count
  FROM public.chats c
  JOIN public.opinions oa ON oa.id = c.opinion_a_id AND COALESCE(oa.visible, true) = true
  JOIN public.opinions ob ON ob.id = c.opinion_b_id AND COALESCE(ob.visible, true) = true
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM public.chat_messages m
    WHERE m.chat_id = c.id AND COALESCE(m.visible, true) = true
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM public.chat_messages m2
    WHERE m2.chat_id = c.id AND COALESCE(m2.visible, true) = true
  ) mc ON true
  WHERE c.topic_id = _topic_id
    AND COALESCE(mc.cnt, 0) > 0
  ORDER BY lm.created_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_topic_chats(uuid) TO anon, authenticated, service_role;