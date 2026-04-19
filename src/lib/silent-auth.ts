/**
 * Silent auth for the TikTok-style /tt UI.
 *
 * Goal: don't create an `auth.users` row until the user actually contributes
 * (posts an opinion, rates, or sends a chat request). Bounce traffic stays free.
 *
 * Strategy:
 * - On first call (no existing session), generate a fresh passphrase, sign up
 *   silently with a deterministic email/password pair, wait for the session,
 *   and return the resulting user.
 * - If a session already exists, return the current user immediately.
 *
 * Failure modes:
 * - If the generated passphrase happens to collide with an existing account
 *   (extremely unlikely), retry up to 3 times with new passphrases.
 */
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  generatePassphrase,
  passphraseToEmail,
  passphraseToPassword,
} from '@/lib/passphrase';

let inflight: Promise<User> | null = null;

async function trySignUp(): Promise<User> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const phrase = generatePassphrase();
    const email = passphraseToEmail(phrase);
    const password = passphraseToPassword(phrase);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/tt` },
    });

    if (!error && data.user) {
      // Mark that this is a freshly-minted silent account
      try {
        localStorage.setItem('freemind_new_account', 'true');
        localStorage.setItem('freemind_silent_phrase', phrase);
      } catch {
        /* ignore */
      }

      // If email confirmations are off, the session is already active.
      if (data.session) return data.user;

      // Otherwise sign in immediately with the same credentials.
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (!signInError && signInData.user) return signInData.user;
    }

    // Collision or transient error → try a new passphrase
  }
  throw new Error('silent_auth_failed');
}

/**
 * Returns the current user, transparently creating a silent account if needed.
 */
export async function ensureSilentAuth(): Promise<User> {
  // Already signed in?
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;

  // Coalesce concurrent callers
  if (inflight) return inflight;
  inflight = trySignUp().finally(() => {
    inflight = null;
  });
  return inflight;
}
