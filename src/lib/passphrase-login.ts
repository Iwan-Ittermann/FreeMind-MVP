import { supabase } from '@/integrations/supabase/client';
import {
  currentPassphraseScope,
  isValidPassphrase,
  passphraseToEmail,
  passphraseToPassword,
  type PassphraseScope,
} from '@/lib/passphrase';

export interface PassphraseLoginResult {
  ok: boolean;
  reason?: 'invalid-format' | 'not-found' | 'error';
}

/**
 * Signs the user in with their passphrase.
 * Any silent/anonymous session is signed out first so the passphrase
 * account becomes the active identity.
 *
 * The scope defaults to the current page, so passphrases from the old
 * events never work inside /wedium and vice versa.
 */
export async function loginWithPassphrase(
  raw: string,
  scope: PassphraseScope = currentPassphraseScope(),
): Promise<PassphraseLoginResult> {
  const phrase = raw.trim().toLowerCase();
  if (!isValidPassphrase(phrase)) return { ok: false, reason: 'invalid-format' };
  try {
    await supabase.auth.signOut({ scope: 'local' });
    const { error } = await supabase.auth.signInWithPassword({
      email: passphraseToEmail(phrase, scope),
      password: passphraseToPassword(phrase),
    });
    if (error) return { ok: false, reason: 'not-found' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
