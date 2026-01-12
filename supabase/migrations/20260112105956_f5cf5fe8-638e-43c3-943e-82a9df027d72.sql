-- Fix security definer view issue
-- Drop the view and recreate as a regular view with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.opinion_pair_ratings;

-- Recreate as a regular function instead of a view
-- This returns the aggregated ratings for the graph layout
CREATE OR REPLACE FUNCTION public.get_opinion_pair_ratings(topic_uuid UUID)
RETURNS TABLE (
  opinion_a_id UUID,
  opinion_b_id UUID,
  avg_empathy DECIMAL,
  avg_disagreement DECIMAL,
  rating_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    c.opinion_a_id,
    c.opinion_b_id,
    AVG(r.empathy) as avg_empathy,
    AVG(r.disagreement) as avg_disagreement,
    COUNT(r.id) as rating_count
  FROM public.chats c
  LEFT JOIN public.chat_ratings r ON c.id = r.chat_id
  WHERE c.topic_id = topic_uuid
  GROUP BY c.opinion_a_id, c.opinion_b_id
$$;