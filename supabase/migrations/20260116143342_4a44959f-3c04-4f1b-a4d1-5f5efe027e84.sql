-- Remove the overly permissive public read policy on chats
-- Keep only the participant-based restriction for privacy
DROP POLICY IF EXISTS "Chats are publicly readable" ON public.chats;