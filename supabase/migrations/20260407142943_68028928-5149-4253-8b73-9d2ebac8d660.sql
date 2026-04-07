
CREATE TABLE public.chat_message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'i_see_you',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction_type)
);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages in their chats
CREATE POLICY "Users can view reactions in their chats"
ON public.chat_message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id = chat_message_reactions.message_id
    AND public.is_chat_participant(cm.chat_id, auth.uid())
  )
);

-- Users can add reactions to messages in their chats
CREATE POLICY "Users can add reactions in their chats"
ON public.chat_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id = chat_message_reactions.message_id
    AND public.is_chat_participant(cm.chat_id, auth.uid())
  )
);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.chat_message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
