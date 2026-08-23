
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  new_opinion boolean not null default true,
  new_message boolean not null default true,
  new_chat boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.push_prefs to authenticated;
grant all on public.push_prefs to service_role;
alter table public.push_prefs enable row level security;
create policy "own push prefs" on public.push_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://jmkbkwhiucnksdygbomc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_queue_service_role_key')
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_notify_push on public.notifications;
create trigger trg_notify_push
after insert on public.notifications
for each row execute function public.notify_push_on_notification();
