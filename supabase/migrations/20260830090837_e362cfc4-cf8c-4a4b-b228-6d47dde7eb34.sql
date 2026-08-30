-- 1. Settings: sandbox + archive topic codes
INSERT INTO public.app_settings (key, value) VALUES
  ('sandbox_topic_short_code', 'sb42'),
  ('archive_topic_short_code', '7mm9')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 2. Sandbox topic
INSERT INTO public.topics (title, description, url_slug, short_code, is_active, status)
SELECT 'Why is social media so toxic but everyone uses it?',
       'Sandbox topic — try out freemind. Data may be reset at any time.',
       'social-media-sandbox', 'sb42', true, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.topics WHERE short_code = 'sb42');

-- 3. Archive topic is closed
UPDATE public.topics SET is_active = false, status = 'Archived' WHERE short_code = '7mm9';

-- 4. Bot opinions in the sandbox (Bot A / B / C)
INSERT INTO public.opinions (topic_id, user_id, text, visible, status)
SELECT t.id, b.uid, b.txt, true, 'Visible'
FROM public.topics t
CROSS JOIN (VALUES
  ('00000000-0000-0000-0000-0000000000b1'::uuid, 'I am Bot A. Social media is toxic because outrage travels faster than nuance — and we all keep feeding it.'),
  ('00000000-0000-0000-0000-0000000000b2'::uuid, 'I am Bot B. It is not the platforms, it is us: we use them exactly as we secretly want to.'),
  ('00000000-0000-0000-0000-0000000000b3'::uuid, 'I am Bot C. Social media is not toxic at all — people simply notice disagreement for the first time.')
) AS b(uid, txt)
WHERE t.short_code = 'sb42'
  AND NOT EXISTS (
    SELECT 1 FROM public.opinions o WHERE o.topic_id = t.id AND o.user_id = b.uid
  );

-- 5. Helper predicates
CREATE OR REPLACE FUNCTION public.is_sandbox_topic(_topic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.topics t
    WHERE t.id = _topic_id
      AND t.short_code = public.event_setting('sandbox_topic_short_code')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_archived_topic(_topic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.topics t
    WHERE t.id = _topic_id
      AND t.short_code = public.event_setting('archive_topic_short_code')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sandbox_topic(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_archived_topic(uuid) TO anon, authenticated, service_role;

-- 6. Write policies: sandbox open to any signed-in user, archive frozen
DROP POLICY IF EXISTS "Users can insert own opinions" ON public.opinions;
CREATE POLICY "Users can insert own opinions" ON public.opinions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.is_archived_topic(topic_id)
  AND (public.is_verified_participant(auth.uid()) OR public.is_sandbox_topic(topic_id))
);

DROP POLICY IF EXISTS "Users can insert own opinion ratings" ON public.opinion_ratings;
CREATE POLICY "Users can insert own opinion ratings" ON public.opinion_ratings
FOR INSERT TO authenticated
WITH CHECK (
  NOT public.is_archived_topic(topic_id)
  AND (public.is_verified_participant(auth.uid()) OR public.is_sandbox_topic(topic_id))
  AND EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = opinion_ratings.rater_opinion_id AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create chat requests for own opinions" ON public.chat_requests;
CREATE POLICY "Users can create chat requests for own opinions" ON public.chat_requests
FOR INSERT TO authenticated
WITH CHECK (
  NOT public.is_archived_topic(topic_id)
  AND (public.is_verified_participant(auth.uid()) OR public.is_sandbox_topic(topic_id))
  AND EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = chat_requests.requester_opinion_id AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_messages.chat_id
      AND NOT public.is_archived_topic(c.topic_id)
      AND (public.is_verified_participant(auth.uid()) OR public.is_sandbox_topic(c.topic_id))
  )
);

DROP POLICY IF EXISTS "Chat participants can rate" ON public.chat_ratings;
CREATE POLICY "Chat participants can rate" ON public.chat_ratings
FOR INSERT TO authenticated
WITH CHECK (
  public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_ratings.chat_id
      AND NOT public.is_archived_topic(c.topic_id)
      AND (public.is_verified_participant(auth.uid()) OR public.is_sandbox_topic(c.topic_id))
  )
);

-- 7. submit_opinion: sandbox needs no verification, archive is frozen
CREATE OR REPLACE FUNCTION public.submit_opinion(_topic_id uuid, _text text, _ip_address text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _opinion_id uuid;
  _uid uuid;
  _open timestamptz;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_archived_topic(_topic_id) THEN
    RAISE EXCEPTION 'This discussion is archived' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_sandbox_topic(_topic_id) AND NOT public.is_verified_participant(_uid) THEN
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
$$;