-- Drop the existing broken insert policy
DROP POLICY IF EXISTS "Users can create chats with their opinions" ON public.chats;

-- Create a corrected insert policy with explicit table references
CREATE POLICY "Users can create chats with their opinions"
ON public.chats
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.user_id = auth.uid()
    AND (o.id = chats.opinion_a_id OR o.id = chats.opinion_b_id)
  )
);