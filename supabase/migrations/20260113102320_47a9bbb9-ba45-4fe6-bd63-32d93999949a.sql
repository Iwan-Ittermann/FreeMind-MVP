-- Create chat_requests table for pending chat invitations
CREATE TABLE public.chat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  requester_opinion_id uuid NOT NULL REFERENCES public.opinions(id) ON DELETE CASCADE,
  target_opinion_id uuid NOT NULL REFERENCES public.opinions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (requester_opinion_id, target_opinion_id)
);

-- Enable RLS
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can see pending requests (for visual indicators on graph)
CREATE POLICY "Chat requests are publicly readable"
ON public.chat_requests
FOR SELECT
USING (true);

-- Users can create requests for their own opinions
CREATE POLICY "Users can create chat requests for own opinions"
ON public.chat_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = requester_opinion_id AND o.user_id = auth.uid()
  )
);

-- Target opinion owner can accept/decline requests
CREATE POLICY "Target can update request status"
ON public.chat_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = target_opinion_id AND o.user_id = auth.uid()
  )
);

-- Requester can delete their pending requests
CREATE POLICY "Requester can delete own pending requests"
ON public.chat_requests
FOR DELETE
USING (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM public.opinions o
    WHERE o.id = requester_opinion_id AND o.user_id = auth.uid()
  )
);

-- Update RLS on chat_messages to allow public read (for read-only mode)
DROP POLICY IF EXISTS "Participants can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages
FOR SELECT
USING (true);

-- Enable realtime for chat_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;