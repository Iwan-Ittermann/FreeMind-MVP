import { supabase } from '@/integrations/supabase/client';
import {
  isValidPassphrase,
  passphraseToEmail,
  passphraseToPassword,
} from '@/lib/passphrase';

export type PassphraseLoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid-format' | 'not-found' | 'error' };

/**
 * Signs the user in with their passphrase.
 * Any silent/anonymous session is signed out first so the passphrase
 * account becomes the active identity.
 */
export async function loginWithPassphrase(raw: string): Promise<PassphraseLoginResult> {
  const phrase = raw.trim().toLowerCase();
  if (!isValidPassphrase(phrase)) return { ok: false, reason: 'invalid-format' };
  try {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email: passphraseToEmail(phrase),
      password: passphraseToPassword(phrase),
    });
    if (error) return { ok: false, reason: 'not-found' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
