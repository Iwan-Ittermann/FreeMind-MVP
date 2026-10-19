export const GRAPH_ANIMATION = {
  messageMinMs: 5600,
  messageMaxMs: 9000,
  ratingMs: 4200,
  differenceRatingMs: 1800,
  ratingGapMs: 180,
  activeEdgeMs: 5600,
  opinionMinMs: 4000,
  opinionMaxMs: 8000,
  maxVisibleEvents: 4,
} as const;

export function readingDuration(text: string, min: number, max: number) {
  return Math.min(max, Math.max(min, min + text.length * 32));
}

export function truncateAtWord(text: string, max = 140) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  const clipped = compact.slice(0, max - 1);
  const boundary = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, boundary > max * 0.65 ? boundary : clipped.length)}…`;
}

export function respectTone(value: number | null | undefined) {
  if (value == null) return 'neutral' as const;
  if (value < 40) return 'low' as const;
  if (value >= 65) return 'high' as const;
  return 'neutral' as const;
}

/** Directed-pair RPC uses respect 0–10 × difference 0–10: max 100, not 1000. */
export function bridgePointTone(points: number | null) {
  if (points == null) return 'unrated' as const;
  if (points < 30) return 'low' as const;
  if (points >= 65) return 'high' as const;
  return 'neutral' as const;
}

/** Chat arrows encode the giver's respect, independently from bridge points. */
export function chatRespectTone(value: number | null | undefined) {
  if (value == null) return 'unrated' as const;
  if (value <= 30) return 'low' as const;
  if (value > 55) return 'high' as const;
  return 'neutral' as const;
}

/** Keep independent opinion reactions separate from respect and chat activity. */
export function graphActivityFields(item: Record<string, unknown>) {
  const kind = item.type === 'difference_rating' ? 'difference_rating' as const
    : item.type === 'rating' ? 'rating' as const : 'message' as const;
  const content = typeof item.content === 'string' ? item.content : undefined;
  return {
    kind, content,
    respect: typeof item.respect === 'number' ? item.respect : undefined,
    disagreement: typeof item.disagreement === 'number' ? item.disagreement : undefined,
    durationMs: kind === 'message' ? readingDuration(content ?? '', GRAPH_ANIMATION.messageMinMs, GRAPH_ANIMATION.messageMaxMs) : kind === 'difference_rating' ? GRAPH_ANIMATION.differenceRatingMs : GRAPH_ANIMATION.ratingMs,
    activatesChat: kind !== 'difference_rating',
  };
}

/** Four presentation lanes; a giver can only occupy one lane at a time. */
export function scheduleOpinionReaction(sourceId: string, now: number, giverEnds: Map<string, number>, laneEnds: number[]) {
  const lane = laneEnds.indexOf(Math.min(...laneEnds));
  const start = Math.max(now, giverEnds.get(sourceId) ?? 0, laneEnds[lane]);
  const end = start + GRAPH_ANIMATION.differenceRatingMs + GRAPH_ANIMATION.ratingGapMs;
  giverEnds.set(sourceId, end);
  laneEnds[lane] = end;
  return start;
}

/** Clamp both flight endpoints; linear interpolation then stays inside these bounds. */
export function messageBubblePosition(x: number, y: number, width: number, height: number) {
  const bubbleWidth = Math.min(150, Math.max(1, width - 8));
  return {
    x: Math.max(bubbleWidth / 2 + 4, Math.min(width - bubbleWidth / 2 - 4, x)),
    y: Math.max(4, Math.min(Math.max(4, height - 58), y)),
    maxWidth: bubbleWidth,
  };
}