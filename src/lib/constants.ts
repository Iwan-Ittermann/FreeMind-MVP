// Well-known constants

/** Fixed UUID for the legacy AI bot — never corresponds to a real auth user */
export const BOT_USER_ID = '00000000-0000-0000-0000-0000000000a1';

/** Sandbox bots A / B / C — fixed UUIDs, no real auth users */
export const SANDBOX_BOT_IDS = [
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000b2',
  '00000000-0000-0000-0000-0000000000b3',
] as const;

const ALL_BOT_IDS = new Set<string>([BOT_USER_ID, ...SANDBOX_BOT_IDS]);

/** True for every bot account (legacy AI bot and the sandbox bots). */
export function isBotUser(userId?: string | null): boolean {
  return !!userId && ALL_BOT_IDS.has(userId);
}

/** Human-readable bot label ("Bot A" …) or null for humans. */
export function botLabel(userId?: string | null): string | null {
  if (!userId) return null;
  const idx = SANDBOX_BOT_IDS.indexOf(userId as (typeof SANDBOX_BOT_IDS)[number]);
  if (idx >= 0) return `Bot ${String.fromCharCode(65 + idx)}`;
  return userId === BOT_USER_ID ? 'Bot' : null;
}

/** Helsinki MVP event topic (now the /aug-test archive). */
export const HELSINKI_TOPIC_SHORT_CODE = '7mm9';

/**
 * Passphrase login is switched off for the wedium phase: partners use the
 * password-gated demo accounts instead, so no passphrase UI is shown.
 */
export const PASSPHRASE_LOGIN_ENABLED = true;
