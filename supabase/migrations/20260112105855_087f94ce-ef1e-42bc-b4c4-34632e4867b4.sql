-- FreeMind Database Schema
-- Opinions, Chats, and Ratings for the graph visualization

-- Topics table (the main discussion questions)
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Topics are publicly readable
CREATE POLICY "Topics are publicly readable"
  ON public.topics FOR SELECT
  USING (true);

-- Opinions table (user submissions)
CREATE TABLE public.opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Each user can only have one opinion per topic
  UNIQUE(topic_id, user_id)
);

-- Enable RLS on opinions
ALTER TABLE public.opinions ENABLE ROW LEVEL SECURITY;

-- Opinions are publicly readable (needed for the graph)
CREATE POLICY "Opinions are publicly readable"
  ON public.opinions FOR SELECT
  USING (true);

-- Users can insert their own opinions
CREATE POLICY "Users can insert own opinions"
  ON public.opinions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own opinions
CREATE POLICY "Users can update own opinions"
  ON public.opinions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own opinions
CREATE POLICY "Users can delete own opinions"
  ON public.opinions FOR DELETE
  USING (auth.uid() = user_id);

-- Chats table (between exactly 2 opinions)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  opinion_a_id UUID NOT NULL REFERENCES public.opinions(id) ON DELETE CASCADE,
  opinion_b_id UUID NOT NULL REFERENCES public.opinions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure opinion_a_id < opinion_b_id to prevent duplicates
  CONSTRAINT chats_unique_pair UNIQUE(opinion_a_id, opinion_b_id),
  CONSTRAINT chats_different_opinions CHECK (opinion_a_id != opinion_b_id)
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user owns one of the opinions in a chat
CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_id UUID, checking_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats c
    JOIN public.opinions oa ON c.opinion_a_id = oa.id
    JOIN public.opinions ob ON c.opinion_b_id = ob.id
    WHERE c.id = chat_id
    AND (oa.user_id = checking_user_id OR ob.user_id = checking_user_id)
  )
$$;

-- Chats are readable by participants only
CREATE POLICY "Chat participants can view chats"
  ON public.chats FOR SELECT
  USING (
    public.is_chat_participant(id, auth.uid())
  );

-- Users can create chats if they own one of the opinions
CREATE POLICY "Users can create chats with their opinions"
  ON public.chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.opinions 
      WHERE id IN (opinion_a_id, opinion_b_id) 
      AND user_id = auth.uid()
    )
  );

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can view messages in their chats
CREATE POLICY "Participants can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_chat_participant(chat_id, auth.uid()));

-- Participants can send messages to their chats
CREATE POLICY "Participants can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id 
    AND public.is_chat_participant(chat_id, auth.uid())
  );

-- Ratings table (each participant rates the chat)
CREATE TABLE public.chat_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empathy DECIMAL(3,2) NOT NULL CHECK (empathy >= 0 AND empathy <= 1),
  disagreement DECIMAL(3,2) NOT NULL CHECK (disagreement >= 0 AND disagreement <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Each user can only rate a chat once
  UNIQUE(chat_id, rater_id)
);

-- Enable RLS on ratings
ALTER TABLE public.chat_ratings ENABLE ROW LEVEL SECURITY;

-- Ratings are publicly readable (needed for the graph layout algorithm)
CREATE POLICY "Ratings are publicly readable"
  ON public.chat_ratings FOR SELECT
  USING (true);

-- Only chat participants can rate
CREATE POLICY "Chat participants can rate"
  ON public.chat_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id 
    AND public.is_chat_participant(chat_id, auth.uid())
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
  ON public.chat_ratings FOR UPDATE
  USING (auth.uid() = rater_id);

-- Create a view for the graph layout algorithm
-- This aggregates ratings between opinion pairs
CREATE OR REPLACE VIEW public.opinion_pair_ratings AS
SELECT 
  c.topic_id,
  c.opinion_a_id,
  c.opinion_b_id,
  AVG(r.empathy) as avg_empathy,
  AVG(r.disagreement) as avg_disagreement,
  COUNT(r.id) as rating_count
FROM public.chats c
LEFT JOIN public.chat_ratings r ON c.id = r.chat_id
GROUP BY c.id, c.topic_id, c.opinion_a_id, c.opinion_b_id;

-- Insert a default topic for testing
INSERT INTO public.topics (id, title, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'What should be done about climate change?',
  'Share your opinion on climate action and engage with others who think differently.'
);