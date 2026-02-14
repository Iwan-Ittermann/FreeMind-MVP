
-- Insert max_speech_bubbles setting
INSERT INTO public.app_settings (key, value) 
VALUES ('max_speech_bubbles', '15')
ON CONFLICT DO NOTHING;
