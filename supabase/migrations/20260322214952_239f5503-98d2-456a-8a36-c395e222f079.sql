
-- Create opinion_ratings table for standalone disagreement ratings
CREATE TABLE public.opinion_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  rater_opinion_id uuid REFERENCES public.opinions(id) ON DELETE CASCADE NOT NULL,
  target_opinion_id uuid REFERENCES public.opinions(id) ON DELETE CASCADE NOT NULL,
  disagreement integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (rater_opinion_id, target_opinion_id)
);

ALTER TABLE public.opinion_ratings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for graph calculation)
CREATE POLICY "Opinion ratings are publicly readable"
  ON public.opinion_ratings FOR SELECT TO public
  USING (true);

-- Users can insert ratings for their own opinions
CREATE POLICY "Users can insert own opinion ratings"
  ON public.opinion_ratings FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.opinions o 
      WHERE o.id = opinion_ratings.rater_opinion_id 
      AND o.user_id = auth.uid()
    )
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own opinion ratings"
  ON public.opinion_ratings FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.opinions o 
      WHERE o.id = opinion_ratings.rater_opinion_id 
      AND o.user_id = auth.uid()
    )
  );

-- Update get_graph_pairs to source disagreement from opinion_ratings instead of chat_ratings
CREATE OR REPLACE FUNCTION public.get_graph_pairs(topic_uuid uuid)
RETURNS TABLE(opinion_a_id uuid, opinion_b_id uuid, avg_empathy numeric, avg_disagreement numeric, rating_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    cr.requester_opinion_id AS opinion_a_id,
    cr.target_opinion_id AS opinion_b_id,
    COALESCE(AVG(r.empathy), 0) as avg_empathy,
    COALESCE(
      (
        SELECT AVG(ord.disagreement)::numeric
        FROM public.opinion_ratings ord
        WHERE (ord.rater_opinion_id = cr.requester_opinion_id AND ord.target_opinion_id = cr.target_opinion_id)
           OR (ord.rater_opinion_id = cr.target_opinion_id AND ord.target_opinion_id = cr.requester_opinion_id)
      ),
      50
    ) as avg_disagreement,
    COUNT(r.id) as rating_count
  FROM public.chat_requests cr
  LEFT JOIN public.chats c ON c.topic_id = topic_uuid
    AND (
      (c.opinion_a_id = cr.requester_opinion_id AND c.opinion_b_id = cr.target_opinion_id)
      OR
      (c.opinion_a_id = cr.target_opinion_id AND c.opinion_b_id = cr.requester_opinion_id)
    )
  LEFT JOIN public.chat_ratings r ON c.id = r.chat_id
  WHERE cr.topic_id = topic_uuid
    AND cr.status = 'accepted'
    AND EXISTS (SELECT 1 FROM public.opinions o WHERE o.id = cr.requester_opinion_id AND o.visible = true)
    AND EXISTS (SELECT 1 FROM public.opinions o WHERE o.id = cr.target_opinion_id AND o.visible = true)
  GROUP BY cr.requester_opinion_id, cr.target_opinion_id
$$;

-- Enable realtime for opinion_ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.opinion_ratings;

-- Add updated_at trigger
CREATE TRIGGER update_opinion_ratings_updated_at
  BEFORE UPDATE ON public.opinion_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
