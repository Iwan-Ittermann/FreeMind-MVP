/**
 * Respect/understanding rating rounds.
 *
 * A rating can be given once per round. The first round unlocks once BOTH
 * participants sent at least two messages; later rounds unlock at growing
 * intervals counting the messages of both participants: 4, 9, 15, 22, 30 …
 */
const FIRST_THRESHOLD = 4;
const FIRST_GAP = 5;

/** Messages each side needs before the first rating unlocks. */
export const MIN_MESSAGES_PER_SIDE = 2;

/** All round thresholds up to (and including the first one above) `total`. */
function thresholds(total: number): number[] {
  const list: number[] = [];
  let t = FIRST_THRESHOLD;
  let gap = FIRST_GAP;
  while (t <= total + 200) {
    list.push(t);
    if (t > total) break;
    t += gap;
    gap += 1;
  }
  return list;
}

/** The round currently open for rating, or null when none is unlocked yet. */
export function currentRatingRound(totalMessages: number): number | null {
  if (totalMessages < FIRST_THRESHOLD) return null;
  const open = thresholds(totalMessages).filter((t) => t <= totalMessages);
  return open.length ? open[open.length - 1] : null;
}

/** The message count at which the next round unlocks. */
export function nextRatingThreshold(totalMessages: number): number {
  const next = thresholds(totalMessages).find((t) => t > totalMessages);
  return next ?? FIRST_THRESHOLD;
}

/** True once both participants sent at least two messages. */
export function bothSidesEngaged(ownMessages: number, partnerMessages: number): boolean {
  return ownMessages >= MIN_MESSAGES_PER_SIDE && partnerMessages >= MIN_MESSAGES_PER_SIDE;
}
