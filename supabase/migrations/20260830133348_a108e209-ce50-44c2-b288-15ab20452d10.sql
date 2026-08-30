-- The August event is over: no real event question any more. This stops the
-- event-only time gates and every event e-mail job (digest, daily brief,
-- campaigns) from picking up the reopened playground activity.
UPDATE public.app_settings SET value = '', updated_at = now()
WHERE key = 'real_topic_short_code';