
CREATE OR REPLACE FUNCTION public.delete_opinion_cascade(_opinion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 1. Delete chat_ratings for chats involving this opinion
  DELETE FROM public.chat_ratings
  WHERE chat_id IN (
    SELECT id FROM public.chats
    WHERE opinion_a_id = _opinion_id OR opinion_b_id = _opinion_id
  );

  -- 2. Delete chat_messages for chats involving this opinion
  DELETE FROM public.chat_messages
  WHERE chat_id IN (
    SELECT id FROM public.chats
    WHERE opinion_a_id = _opinion_id OR opinion_b_id = _opinion_id
  );

  -- 3. Delete chats involving this opinion
  DELETE FROM public.chats
  WHERE opinion_a_id = _opinion_id OR opinion_b_id = _opinion_id;

  -- 4. Delete chat_requests involving this opinion
  DELETE FROM public.chat_requests
  WHERE requester_opinion_id = _opinion_id OR target_opinion_id = _opinion_id;

  -- 5. Delete opinion_ratings involving this opinion
  DELETE FROM public.opinion_ratings
  WHERE rater_opinion_id = _opinion_id OR target_opinion_id = _opinion_id;

  -- 6. Delete user_blocks related to chats of this opinion (already deleted chats, but clean up)
  -- user_blocks reference chat_id which we already deleted, but the rows remain
  -- No action needed since chats are gone and user_blocks don't cascade

  -- 7. Delete the opinion itself
  DELETE FROM public.opinions WHERE id = _opinion_id;

  -- 8. Log audit
  PERFORM log_audit('delete_opinion_cascade', 'opinions', _opinion_id,
    jsonb_build_object('deleted_by', _uid));
END;
$$;
