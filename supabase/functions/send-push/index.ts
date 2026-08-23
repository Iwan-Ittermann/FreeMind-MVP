// Sends a Web Push notification for a freshly inserted `notifications` row.
// Invoked by a database trigger with the service-role key.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@freemind.chat';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type PrefKey = 'new_opinion' | 'new_message' | 'new_chat';

function prefKeyForType(type: string): PrefKey | null {
  if (type === 'opinion' || type === 'new_opinion') return 'new_opinion';
  if (type === 'message' || type === 'new_message') return 'new_message';
  if (type === 'chat' || type === 'new_chat' || type === 'chat_request' || type === 'request_accepted') {
    return 'new_chat';
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Only the database trigger (shared vault token) or the service role may call this.
  const auth = req.headers.get('Authorization') ?? '';
  const token = req.headers.get('x-push-token') ?? '';
  let allowed = auth === `Bearer ${SERVICE_ROLE_KEY}`;
  if (!allowed && token) {
    const { data: ok } = await supabase.rpc('verify_push_trigger_token', { _token: token });
    allowed = ok === true;
  }
  if (!allowed) {
    return json({ error: 'unauthorized' }, 401);
  }


  let notificationId: string | undefined;
  try {
    const body = await req.json();
    notificationId = typeof body?.notification_id === 'string' ? body.notification_id : undefined;
  } catch {
    // ignore
  }
  if (!notificationId) return json({ error: 'notification_id required' }, 400);




  const { data: notification, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, link, chat_id, topic_id')
    .eq('id', notificationId)
    .maybeSingle();

  if (error || !notification) return json({ error: 'notification not found' }, 404);

  const userId = notification.user_id as string;

  // Preferences — missing row means "all on".
  const { data: prefs } = await supabase
    .from('push_prefs')
    .select('enabled, new_opinion, new_message, new_chat')
    .eq('user_id', userId)
    .maybeSingle();

  if (prefs && prefs.enabled === false) return json({ skipped: 'push disabled' });
  const key = prefKeyForType(notification.type as string);
  if (prefs && key && prefs[key] === false) return json({ skipped: `filtered: ${key}` });

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return json({ skipped: 'no subscriptions' });

  // Badge = unread notifications for this user.
  const { count: unread } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body ?? '',
    // Collapse repeated pushes of the same conversation.
    tag: notification.chat_id ? `chat-${notification.chat_id}` : `notif-${notification.type}`,
    link: notification.link ?? '/go',
    badge: unread ?? 0,
  });

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload,
          { TTL: 3600, urgency: 'normal' },
        );
        sent++;
        await supabase
          .from('push_subscriptions')
          .update({ last_success_at: new Date().toISOString() })
          .eq('id', s.id as string);
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) stale.push(s.id as string);
        else console.error('push failed', status, (e as Error)?.message);
      }
    }),
  );

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', stale);
  }

  return json({ sent, removed: stale.length });
});
