-- Create get_graph_pairs RPC (SECURITY DEFINER) for canonical graph data
-- Returns only pairs with accepted chat_requests AND both opinions visible
CREATE OR REPLACE FUNCTION public.get_graph_pairs(topic_uuid uuid)
 RETURNS TABLE(opinion_a_id uuid, opinion_b_id uuid, avg_empathy numeric, avg_disagreement numeric, rating_count bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    cr.requester_opinion_id AS opinion_a_id,
    cr.target_opinion_id AS opinion_b_id,
    COALESCE(AVG(r.empathy), 0) as avg_empathy,
    COALESCE(AVG(r.disagreement), 50) as avg_disagreement,
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
$function$;

-- Cleanup ghost chats (chats with no messages, no ratings, and no accepted chat_request)
DELETE FROM public.chats c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_messages cm WHERE cm.chat_id = c.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.chat_ratings cr WHERE cr.chat_id = c.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.chat_requests req
  WHERE req.topic_id = c.topic_id
    AND req.status = 'accepted'
    AND (
      (req.requester_opinion_id = c.opinion_a_id AND req.target_opinion_id = c.opinion_b_id)
      OR
      (req.requester_opinion_id = c.opinion_b_id AND req.target_opinion_id = c.opinion_a_id)
    )
);