select cron.schedule(
  'send-notification-digest',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://jmkbkwhiucnksdygbomc.supabase.co/functions/v1/send-notification-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);