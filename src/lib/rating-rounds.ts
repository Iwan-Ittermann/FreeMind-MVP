/**
 * Respect/understanding rating rounds.
 *
 * A rating can be given once per round. Rounds unlock at growing intervals,
 * counting the messages of BOTH participants: 3, 7, 12, 18, 25, 33 …
 * (first gap 4, then 5, 6, 7 …).
 */
const FIRST_THRESHOLD = 3;
const FIRST_GAP = 4;

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
