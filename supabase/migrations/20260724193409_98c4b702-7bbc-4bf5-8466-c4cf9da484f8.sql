-- Single-topic build cleanup: drop multi-topic RPCs and user_topics table

DROP FUNCTION IF EXISTS public.join_topic(text, text);
DROP FUNCTION IF EXISTS public.has_joined_topic(uuid);
DROP FUNCTION IF EXISTS public.get_user_topics();
DROP FUNCTION IF EXISTS public.create_topic(text, text);
DROP TABLE IF EXISTS public.user_topics CASCADE;