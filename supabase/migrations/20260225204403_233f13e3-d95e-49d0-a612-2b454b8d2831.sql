ALTER TABLE public.opinions DROP CONSTRAINT IF EXISTS opinions_user_id_fkey;
ALTER TABLE public.opinions DROP CONSTRAINT IF EXISTS opinion_user_id_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;