
-- 1. Signups: new columns
ALTER TABLE public.signups
  ADD COLUMN IF NOT EXISTS passphrase text,
  ADD COLUMN IF NOT EXISTS passphrase_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS last_passphrase_sent_at timestamptz;

-- 2. Verified participants
CREATE TABLE IF NOT EXISTS public.verified_participants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  signup_id uuid NOT NULL UNIQUE REFERENCES public.signups(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verified_participants TO authenticated;
GRANT ALL ON public.verified_participants TO service_role;

ALTER TABLE public.verified_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification" ON public.verified_participants;
CREATE POLICY "Users can view own verification"
  ON public.verified_participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Helper: is verified participant (bot + admins always count as verified)
CREATE OR REPLACE FUNCTION public.is_verified_participant(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL AND (
      _user_id = '00000000-0000-0000-0000-0000000000a1'::uuid
      OR EXISTS (SELECT 1 FROM public.verified_participants WHERE user_id = _user_id)
      OR public.has_role(_user_id, 'admin')
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_verified_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_verified_participant(uuid) TO authenticated, service_role;

-- 4. Seed cutoff setting (idempotent)
INSERT INTO public.app_settings (key, value)
VALUES ('registration_cutoff_at', '')
ON CONFLICT (key) DO NOTHING;

-- 5. Tighten INSERT policies to require verified participation
-- opinions
DROP POLICY IF EXISTS "Users can insert own opinions" ON public.opinions;
CREATE POLICY "Users can insert own opinions"
  ON public.opinions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_verified_participant(auth.uid()));

-- chats
DROP POLICY IF EXISTS "Users can create chats with their opinions" ON public.chats;
CREATE POLICY "Users can create chats with their opinions"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_verified_participant(auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.opinions o WHERE o.id = opinion_a_id AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.opinions o WHERE o.id = opinion_b_id AND o.user_id = auth.uid())
    )
  );

-- chat_messages
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_verified_participant(auth.uid())
    AND public.is_chat_participant(chat_id, auth.uid())
  );

-- chat_requests
DROP POLICY IF EXISTS "Users can create chat requests for own opinions" ON public.chat_requests;
CREATE POLICY "Users can create chat requests for own opinions"
  ON public.chat_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_verified_participant(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = requester_opinion_id AND o.user_id = auth.uid()
    )
  );

-- opinion_ratings
DROP POLICY IF EXISTS "Users can insert own opinion ratings" ON public.opinion_ratings;
CREATE POLICY "Users can insert own opinion ratings"
  ON public.opinion_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_verified_participant(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = rater_opinion_id AND o.user_id = auth.uid()
    )
  );

-- chat_ratings
DROP POLICY IF EXISTS "Chat participants can rate" ON public.chat_ratings;
CREATE POLICY "Chat participants can rate"
  ON public.chat_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_verified_participant(auth.uid())
    AND public.is_chat_participant(chat_id, auth.uid())
  );

-- 6. Update submit_opinion RPC to enforce verified participation
CREATE OR REPLACE FUNCTION public.submit_opinion(_topic_id uuid, _text text, _ip_address text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _opinion_id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_verified_participant(_uid) THEN
    RAISE EXCEPTION 'Not verified: email confirmation required' USING ERRCODE = '42501';
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
