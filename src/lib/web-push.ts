import { supabase } from '@/integrations/supabase/client';

/** Public VAPID key (safe to ship in the client). */
export const VAPID_PUBLIC_KEY =
  'BGstvggs4PsI5Sim6jH5toEPXL_i0amqWt-LgUs-SGuRadiqrn5vNlR47ZeS0BvMgXFR3ZVUAP2Izj-fuGpRrQU';

const SW_PATH = '/push-sw.js';

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost() {
  const h = window.location.hostname;
  return (
    h.startsWith('id-preview--') ||
    h.startsWith('preview--') ||
    h === 'lovableproject.com' ||
    h.endsWith('.lovableproject.com') ||
    h === 'lovableproject-dev.com' ||
    h.endsWith('.lovableproject-dev.com') ||
    h === 'beta.lovable.dev' ||
    h.endsWith('.beta.lovable.dev')
  );
}

/** Push is only wired up in the published app — never in dev or the Lovable preview. */
export function pushContextBlocked() {
  return !import.meta.env.PROD || inIframe() || isPreviewHost();
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** True when running as an installed home-screen app. */
export function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** iOS delivers Web Push only from the installed home-screen app. */
export function needsInstallFirst() {
  return isIOS() && !isStandalone();
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getRegistration() {
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

/** Is this device currently subscribed? */
export async function getPushStatus(): Promise<'unsupported' | 'blocked' | 'off' | 'on'> {
  if (!pushSupported()) return 'unsupported';
  if (pushContextBlocked()) return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export type SubscribeResult =
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'blocked'
  | 'needs-install'
  | 'needs-login'
  | 'error';

export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!pushSupported()) return 'unsupported';
  if (pushContextBlocked()) return 'blocked';
  if (needsInstallFirst()) return 'needs-install';

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'needs-login';

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return 'error';
    }
  }
  if (permission !== 'granted') return 'denied';

  try {
    const reg = await getRegistration();
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'error';

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: auth.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
      },
      { onConflict: 'endpoint' },
    );
    if (error) return 'error';

    await supabase
      .from('push_prefs')
      .upsert({ user_id: auth.user.id, enabled: true }, { onConflict: 'user_id' });

    return 'subscribed';
  } catch {
    return 'error';
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase
        .from('push_prefs')
        .upsert({ user_id: auth.user.id, enabled: false }, { onConflict: 'user_id' });
    }
    return true;
  } catch {
    return false;
  }
}

/** Mirror the local bell filters into the DB so the server can honour them. */
export async function syncPushFilters(filters: {
  newOpinion: boolean;
  newMessage: boolean;
  newChat: boolean;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('push_prefs').upsert(
    {
      user_id: auth.user.id,
      new_opinion: filters.newOpinion,
      new_message: filters.newMessage,
      new_chat: filters.newChat,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}
