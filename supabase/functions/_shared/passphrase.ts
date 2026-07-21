// Shared passphrase generator (Deno edge functions).
// Kept in sync with src/lib/passphrase.ts on the client.

const adjectives = [
  'brave', 'calm', 'eager', 'fancy', 'gentle', 'happy', 'jolly', 'kind',
  'lively', 'merry', 'nice', 'proud', 'quick', 'sharp', 'swift', 'warm',
  'bright', 'clear', 'fresh', 'grand', 'noble', 'quiet', 'smart', 'vivid',
  'bold', 'cool', 'fair', 'keen', 'pure', 'rich', 'safe', 'wise',
];

const nouns = [
  'apple', 'beach', 'cloud', 'dream', 'eagle', 'flame', 'grape', 'heart',
  'island', 'jewel', 'kite', 'lemon', 'moon', 'north', 'ocean', 'peace',
  'quest', 'river', 'stone', 'tiger', 'umbra', 'voice', 'wave', 'youth',
  'anchor', 'bridge', 'castle', 'delta', 'ember', 'forest', 'garden', 'harbor',
];

const verbs = [
  'dance', 'float', 'glide', 'hover', 'jump', 'laugh', 'march', 'paint',
  'quest', 'rise', 'shine', 'think', 'unite', 'value', 'watch', 'yield',
  'bloom', 'climb', 'drift', 'echo', 'flash', 'gleam', 'honor', 'ignite',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generatePassphrase(): string {
  return `${pick(adjectives)}-${pick(nouns)}-${pick(verbs)}-${Math.floor(Math.random() * 100)}`;
}

export function passphraseToEmail(p: string): string {
  return `${p.toLowerCase().trim().replace(/-/g, '.')}@freemind.local`;
}

export function passphraseToPassword(p: string): string {
  return p.toLowerCase().trim().split('').reverse().join('') + '_FM2024';
}
