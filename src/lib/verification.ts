import { supabase } from '@/integrations/supabase/client';

type Listener = (open: boolean) => void;
let listeners: Listener[] = [];
let currentOpen = false;

export function subscribeVerificationDialog(l: Listener) {
  listeners.push(l);
  l(currentOpen);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

function setOpen(open: boolean) {
  currentOpen = open;
  listeners.forEach((l) => l(open));
}

export function openVerificationDialog() {
  setOpen(true);
}

export function closeVerificationDialog() {
  setOpen(false);
}

/**
 * Returns true iff the current auth user is a verified participant
 * (email-confirmed, in public.verified_participants, or admin/bot).
 * Opens the verification dialog and returns false otherwise.
 *
 * Server-side RLS still enforces the same rule; this only improves UX.
 */
export async function requireVerified(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) {
    openVerificationDialog();
    return false;
  }
  const { data } = await supabase
    .from('verified_participants')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (data) return true;

  // Admins are also allowed server-side; check role so we don't nag admins.
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', uid)
    .eq('role', 'admin')
    .maybeSingle();
  if (roleRow) return true;

  openVerificationDialog();
  return false;
}
