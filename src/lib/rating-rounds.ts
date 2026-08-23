/**
 * Respect/understanding rating gate.
 *
 * The scale unlocks as soon as BOTH participants sent at least one message and
 * then stays open permanently — users can adjust their rating at any time.
 * Points remain manipulation-proof because every change is appended to
 * `rating_events` and weighted by how long a value was held.
 */

/** Messages each side needs before the rating unlocks. */
export const MIN_MESSAGES_PER_SIDE = 1;

/** True once both participants sent at least one message. */
export function respectUnlocked(ownMessages: number, partnerMessages: number): boolean {
  return ownMessages >= MIN_MESSAGES_PER_SIDE && partnerMessages >= MIN_MESSAGES_PER_SIDE;
}
