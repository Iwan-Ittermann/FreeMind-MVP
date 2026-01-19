-- Feature 5: Add read_at column for unread message tracking
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient unread message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
ON public.chat_messages(chat_id, sender_id) 
WHERE read_at IS NULL;

-- Feature 8: Create user_blocks table for reversible blocking
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_user_id UUID NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reason TEXT,
  UNIQUE(blocker_id, blocked_user_id, chat_id)
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own blocks
CREATE POLICY "Users can view own blocks" 
ON public.user_blocks 
FOR SELECT 
USING (auth.uid() = blocker_id);

-- Policy: Users can create blocks
CREATE POLICY "Users can create blocks" 
ON public.user_blocks 
FOR INSERT 
WITH CHECK (auth.uid() = blocker_id);

-- Policy: Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks" 
ON public.user_blocks 
FOR DELETE 
USING (auth.uid() = blocker_id);

-- Admin can view all blocks
CREATE POLICY "Admins can view all blocks"
ON public.user_blocks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));