-- Make chat edges visible to everyone (prototype behavior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chats'
      AND policyname = 'Chats are publicly readable'
  ) THEN
    CREATE POLICY "Chats are publicly readable"
      ON public.chats
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Improve realtime payloads on UPDATE/DELETE (safe for INSERT too)
ALTER TABLE public.opinions REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_requests REPLICA IDENTITY FULL;
ALTER TABLE public.chat_ratings REPLICA IDENTITY FULL;

-- Ensure the graph-related tables publish realtime changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'opinions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opinions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_ratings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_ratings;
  END IF;
END $$;