export const GRAPH_ANIMATION = {
  messageMinMs: 3200,
  messageMaxMs: 5600,
  ratingMs: 4200,
  activeEdgeMs: 5600,
  opinionMinMs: 4000,
  opinionMaxMs: 8000,
  maxVisibleEvents: 4,
} as const;

export function readingDuration(text: string, min: number, max: number) {
  return Math.min(max, Math.max(min, min + text.length * 24));
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