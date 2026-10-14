CREATE OR REPLACE FUNCTION public.reply_to_sim_message(p_message_id uuid, p_language text DEFAULT 'de')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message public.chat_messages%ROWTYPE;
  v_chat public.chats%ROWTYPE;
  v_partner uuid;
  v_reply uuid;
  v_count integer;
  v_replies text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_message FROM public.chat_messages WHERE id = p_message_id AND sender_id = auth.uid() AND visible IS TRUE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_chat FROM public.chats WHERE id = v_message.chat_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_sim_topic(v_chat.topic_id) THEN RETURN NULL; END IF;
  SELECT CASE WHEN a.user_id = auth.uid() THEN b.user_id ELSE a.user_id END INTO v_partner
  FROM public.opinions a, public.opinions b
  WHERE a.id = v_chat.opinion_a_id AND b.id = v_chat.opinion_b_id
    AND auth.uid() IN (a.user_id, b.user_id);
  IF v_partner IS NULL OR v_partner = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sim_personas WHERE user_id = auth.uid())
    OR NOT EXISTS (SELECT 1 FROM public.sim_personas WHERE user_id = v_partner) THEN RETURN NULL; END IF;
  SELECT id INTO v_reply FROM public.chat_messages WHERE chat_id = v_chat.id AND sender_id = v_partner AND reply_to_id = p_message_id LIMIT 1;
  IF v_reply IS NOT NULL THEN RETURN v_reply; END IF;
  SELECT count(*) INTO v_count FROM public.chat_messages m JOIN public.chat_messages original ON original.id = m.reply_to_id
    WHERE m.chat_id = v_chat.id AND m.sender_id = v_partner AND original.sender_id = auth.uid();
  IF p_language = 'en' THEN
    v_replies := ARRAY[
      'Thanks for sharing your perspective. What experience has shaped your view most?',
      'I see this differently, but I would like to understand your reasoning. What matters most to you here?',
      'That is an interesting point. What would a concrete improvement look like to you?',
      'I can understand that concern. How could we take it seriously without excluding other perspectives?',
      'We may have more common ground than it first appears. Which goal could we agree on?',
      'I had not looked at it that way before. Can you give me an example?',
      'I still have reservations. What would you say to someone who has had a very different experience?',
      'Thank you for keeping the conversation constructive. Where would you draw the line?',
      'I would not agree with every part, but your point makes me think. What would be a fair compromise?',
      'Maybe we do not need to agree on everything. What should I take away from your perspective?'
    ];
  ELSE
    v_replies := ARRAY[
      'Danke, dass du deine Perspektive teilst. Welche Erfahrung hat deine Sicht besonders geprägt?',
      'Ich sehe das anders, möchte deine Gründe aber verstehen. Was ist dir dabei am wichtigsten?',
      'Das ist ein interessanter Punkt. Wie würde eine konkrete Verbesserung für dich aussehen?',
      'Die Sorge kann ich nachvollziehen. Wie könnten wir sie ernst nehmen, ohne andere Perspektiven auszuschließen?',
      'Vielleicht verbindet uns mehr, als es zunächst scheint. Auf welches Ziel könnten wir uns einigen?',
      'So habe ich das noch nicht betrachtet. Kannst du mir ein Beispiel nennen?',
      'Ich habe noch Vorbehalte. Was würdest du jemandem sagen, der ganz andere Erfahrungen gemacht hat?',
      'Danke, dass du sachlich bleibst. Wo würdest du persönlich die Grenze ziehen?',
      'Ich würde nicht allem zustimmen, aber dein Punkt bringt mich zum Nachdenken. Was wäre ein fairer Kompromiss?',
      'Vielleicht müssen wir uns nicht in allem einig sein. Was sollte ich aus deiner Perspektive mitnehmen?'
    ];
  END IF;
  INSERT INTO public.chat_messages (chat_id, sender_id, content, reply_to_id)
    VALUES (v_chat.id, v_partner, v_replies[(v_count % 10) + 1], p_message_id) RETURNING id INTO v_reply;
  RETURN v_reply;
END;
$$;
REVOKE ALL ON FUNCTION public.reply_to_sim_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_sim_message(uuid, text) TO authenticated;
COMMENT ON FUNCTION public.reply_to_sim_message(uuid, text) IS 'One of ten rotating localized test replies, only to the authenticated visitor own message in a chat with a simulation persona. Chat row lock makes retries idempotent.';