
-- Add voice message columns to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN audio_url text;
ALTER TABLE public.chat_messages ADD COLUMN transcript text;

-- Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true);

-- Public read access for voice messages
CREATE POLICY "Voice messages are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

-- Authenticated users can upload voice messages
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');

-- Users can delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);
