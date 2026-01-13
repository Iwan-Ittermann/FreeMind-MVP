-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can create chats with their opinions" ON public.chats;

-- Create a corrected insert policy
CREATE POLICY "Users can create chats with their opinions" 
ON public.chats 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM opinions 
    WHERE opinions.user_id = auth.uid() 
    AND (opinions.id = opinion_a_id OR opinions.id = opinion_b_id)
  )
);