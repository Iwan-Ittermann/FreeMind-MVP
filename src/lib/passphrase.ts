/**
 * Mnemonic Passphrase Generator
 * Generates memorable passphrases for authentication
 */

const adjectives = [
  'brave', 'calm', 'eager', 'fancy', 'gentle', 'happy', 'jolly', 'kind',
  'lively', 'merry', 'nice', 'proud', 'quick', 'sharp', 'swift', 'warm',
  'bright', 'clear', 'fresh', 'grand', 'noble', 'quiet', 'smart', 'vivid',
  'bold', 'cool', 'fair', 'keen', 'pure', 'rich', 'safe', 'wise'
];

const nouns = [
  'apple', 'beach', 'cloud', 'dream', 'eagle', 'flame', 'grape', 'heart',
  'island', 'jewel', 'kite', 'lemon', 'moon', 'north', 'ocean', 'peace',
  'quest', 'river', 'stone', 'tiger', 'umbra', 'voice', 'wave', 'youth',
  'anchor', 'bridge', 'castle', 'delta', 'ember', 'forest', 'garden', 'harbor'
];

const verbs = [
  'dance', 'float', 'glide', 'hover', 'jump', 'laugh', 'march', 'paint',
  'quest', 'rise', 'shine', 'think', 'unite', 'value', 'watch', 'yield',
  'bloom', 'climb', 'drift', 'echo', 'flash', 'gleam', 'honor', 'ignite'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(): number {
  return Math.floor(Math.random() * 100);
}

/**
 * Generates a memorable passphrase like "brave-ocean-dance-42"
 */
export function generatePassphrase(): string {
  const adj = getRandomElement(adjectives);
  const noun = getRandomElement(nouns);
  const verb = getRandomElement(verbs);
  const num = getRandomNumber();
  
  return `${adj}-${noun}-${verb}-${num}`;
}

/**
 * Validates passphrase format
 */
export function isValidPassphrase(passphrase: string): boolean {
  // Format: word-word-word-number
  const pattern = /^[a-z]+-[a-z]+-[a-z]+-\d+$/;
  return pattern.test(passphrase.toLowerCase().trim());
}

/**
 * Access scopes. Each event keeps its own, strictly separated account space:
 * a passphrase issued for one scope can never sign in on the other.
 */
export type PassphraseScope = 'freemind' | 'wedium';

const SCOPE_DOMAINS: Record<PassphraseScope, string> = {
  freemind: 'freemind.local',
  wedium: 'wedium.local',
};

/** The scope of the page the visitor is currently on. */
export function currentPassphraseScope(): PassphraseScope {
  try {
    return window.location.pathname.toLowerCase().startsWith('/wedium')
      ? 'wedium'
      : 'freemind';
  } catch {
    return 'freemind';
  }
}

/**
 * Converts passphrase to a deterministic email for Supabase auth
 * This allows using passphrase as the sole credential
 */
export function passphraseToEmail(
  passphrase: string,
  scope: PassphraseScope = currentPassphraseScope(),
): string {
  const normalized = passphrase.toLowerCase().trim();
  // Create a pseudo-email from the passphrase
  return `${normalized.replace(/-/g, '.')}@${SCOPE_DOMAINS[scope]}`;
}

/**
 * Extracts passphrase from email format
 * Reverse of passphraseToEmail
 */
export function emailToPassphrase(email: string): string | null {
  const domain = Object.values(SCOPE_DOMAINS).find((d) => email?.endsWith(`@${d}`));
  if (!domain) return null;

  const localPart = email.replace(`@${domain}`, '');
  const passphrase = localPart.replace(/\./g, '-');

  if (isValidPassphrase(passphrase)) {
    return passphrase;
  }

  return null;
}


/**
 * Generates a deterministic password from passphrase
 * Uses the passphrase itself with a salt for the password
 */
export function passphraseToPassword(passphrase: string): string {
  const normalized = passphrase.toLowerCase().trim();
  // The password is the passphrase reversed + a constant
  return normalized.split('').reverse().join('') + '_FM2024';
}
