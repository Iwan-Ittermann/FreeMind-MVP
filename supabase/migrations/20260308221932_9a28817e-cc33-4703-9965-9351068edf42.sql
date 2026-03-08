-- Allow chat participants to mark messages as read (update read_at)
CREATE POLICY "Participants can mark messages as read"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  is_chat_participant(chat_id, auth.uid())
  AND sender_id != auth.uid()
)
WITH CHECK (
  is_chat_participant(chat_id, auth.uid())
  AND sender_id != auth.uid()
);