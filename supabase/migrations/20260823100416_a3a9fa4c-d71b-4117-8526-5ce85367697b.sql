
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'push_trigger_token') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'push_trigger_token');
  end if;
end $$;

create or replace function public.verify_push_trigger_token(_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name = 'push_trigger_token';
  return expected is not null and _token = expected;
end;
$$;

revoke all on function public.verify_push_trigger_token(text) from public, anon, authenticated;
grant execute on function public.verify_push_trigger_token(text) to service_role;

create or replace function public.notify_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tok text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'push_trigger_token';
  perform net.http_post(
    url := 'https://jmkbkwhiucnksdygbomc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-token', coalesce(tok, '')
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  return new;
end;
$$;
