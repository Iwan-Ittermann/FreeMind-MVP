
INSERT INTO app_settings (key, value)
VALUES ('active_theme', 'classic')
ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
