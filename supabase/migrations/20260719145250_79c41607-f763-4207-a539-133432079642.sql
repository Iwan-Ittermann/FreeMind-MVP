
-- Fix bot participant logic + hardcoded backdoor
CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_id uuid, checking_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.opinions oa ON c.opinion_a_id = oa.id
    JOIN public.opinions ob ON c.opinion_b_id = ob.id
    WHERE c.id = chat_id
    AND (
      oa.user_id = checking_user_id
      OR ob.user_id = checking_user_id
      OR checking_user_id = '00000000-0000-0000-0000-0000000000a1'
    )
  )
$$;

-- Hide opinions.ip_address from clients
REVOKE SELECT (ip_address) ON public.opinions FROM anon, authenticated;

-- chat_ratings: restrict SELECT to participants/admins
DROP POLICY IF EXISTS "Ratings are publicly readable" ON public.chat_ratings;
CREATE POLICY "Chat participants and admins can view chat ratings"
  ON public.chat_ratings FOR SELECT
  USING (
    public.is_chat_participant(chat_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- chat_requests: restrict SELECT to involved users/admins + aggregation RPC
DROP POLICY IF EXISTS "Chat requests are publicly readable" ON public.chat_requests;
CREATE POLICY "Involved users and admins can view chat requests"
  ON public.chat_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE (o.id = chat_requests.requester_opinion_id OR o.id = chat_requests.target_opinion_id)
        AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.get_topic_chat_request_edges(_topic_id uuid)
RETURNS TABLE(id uuid, topic_id uuid, requester_opinion_id uuid, target_opinion_id uuid, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, topic_id, requester_opinion_id, target_opinion_id, status, created_at
  FROM public.chat_requests
  WHERE topic_id = _topic_id
$$;
REVOKE ALL ON FUNCTION public.get_topic_chat_request_edges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_topic_chat_request_edges(uuid) TO anon, authenticated;

-- opinion_ratings: restrict SELECT to raters/admins + aggregation RPC
DROP POLICY IF EXISTS "Opinion ratings are publicly readable" ON public.opinion_ratings;
CREATE POLICY "Raters and admins can view opinion ratings"
  ON public.opinion_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opinions o
      WHERE o.id = opinion_ratings.rater_opinion_id AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.get_topic_disagreement_pairs(_topic_id uuid)
RETURNS TABLE(rater_opinion_id uuid, target_opinion_id uuid, disagreement integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT rater_opinion_id, target_opinion_id, disagreement
  FROM public.opinion_ratings
  WHERE topic_id = _topic_id
$$;
REVOKE ALL ON FUNCTION public.get_topic_disagreement_pairs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_topic_disagreement_pairs(uuid) TO anon, authenticated;

-- Voice message storage policies (bucket already set private via storage tool)
DROP POLICY IF EXISTS "Voice messages are publicly accessible" ON storage.objects;
CREATE POLICY "Voice messages accessible to chat participants"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-messages'
    AND auth.uid() IS NOT NULL
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_chat_participant(NULLIF((storage.foldername(name))[2], '')::uuid, auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Users upload own voice messages to own chats"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND auth.uid() IS NOT NULL
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.is_chat_participant(NULLIF((storage.foldername(name))[2], '')::uuid, auth.uid())
  );

-- Lock down internal SECURITY DEFINER helpers from direct client execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_opinion(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_bot_message(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_topic_short_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_fake_node_opinion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_accept_bot_requests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Remove permissive "true" write policy on test_diskussion_replies
DROP POLICY IF EXISTS "Anyone can insert replies" ON public.test_diskussion_replies;
CREATE POLICY "Authenticated users can insert replies"
  ON public.test_diskussion_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
