import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MouseEvent } from 'react';
import { GraphNode } from '@/types/graph';
import { ChatArrow } from '@/hooks/useChatArrows';
import type { MessageAnimationData } from '@/hooks/useTopicData';
import { bridgePointTone, respectTone } from '@/lib/graph-animation';

interface SignalChatArrowsProps {
  arrows: readonly ChatArrow[];
  nodeMap: ReadonlyMap<string, GraphNode>;
  nodeRadius: number;
  highlightedNode: string | null;
  onArrowClick?: (sourceId: string, targetId: string) => void;
  liveEvents?: readonly MessageAnimationData[];
}

/** Discrete length steps so "longer = more messages" stays readable. */
const LENGTH_STEPS = 6;
const MIN_LEN = 7;
const MAX_LEN = 34;
const MESSAGE_CAP = 40;

function arrowLength(messageCount: number, distance: number): number {
  const t = Math.sqrt(Math.min(messageCount, MESSAGE_CAP) / MESSAGE_CAP);
  const stepped = Math.round(t * (LENGTH_STEPS - 1)) / (LENGTH_STEPS - 1);
  const raw = MIN_LEN + stepped * (MAX_LEN - MIN_LEN);
  // never longer than a quarter of the way to the partner
  return Math.max(5, Math.min(raw, distance * 0.25));
}

/** Absolute scale: received points derive from respect × 0–10 disagreement. */
function arrowColor(points: number | null): string {
  const tone = bridgePointTone(points);
  if (tone === 'unrated') return 'hsl(var(--muted-foreground))';
  if (tone === 'low') return 'hsl(var(--destructive))';
  if (tone === 'high') return 'hsl(var(--success))';
  return 'hsl(var(--accent-warm))';
}

export function SignalChatArrows({
  arrows, nodeMap, nodeRadius, highlightedNode, onArrowClick, liveEvents = [],
}: SignalChatArrowsProps) {
  const liveRatings = useMemo(() => new Map(liveEvents.filter(event => event.kind === 'rating').map(event => [`${event.sourceOpinionId}|${event.targetOpinionId}`, event])), [liveEvents]);

  const handleClick = (event: MouseEvent<SVGGElement>, a: ChatArrow) => {
    event.stopPropagation();
    onArrowClick?.(a.fromOpinionId, a.toOpinionId);
  };

  return (
    <g className="signal-chat-arrows">
      {arrows.map((a, i) => {
        const from = nodeMap.get(a.fromOpinionId);
        const to = nodeMap.get(a.toOpinionId);
        if (!from || !to) return null;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return null;
        const ux = dx / dist;
        const uy = dy / dist;

        const start = nodeRadius + 3;
        const len = arrowLength(a.messageCount, dist);
        const x1 = from.x + ux * start;
        const y1 = from.y + uy * start;
        const x2 = from.x + ux * (start + len);
        const y2 = from.y + uy * (start + len);

        const involved = !highlightedNode ||
          a.fromOpinionId === highlightedNode ||
          a.toOpinionId === highlightedNode;
        const isHighlighted = !!highlightedNode && involved;
        const opacity = involved ? (isHighlighted ? 1 : 0.75) : 0.15;
        const ratingEvent = liveRatings.get(`${a.toOpinionId}|${a.fromOpinionId}`);
        const tone = respectTone(ratingEvent?.respect);
        const color = ratingEvent ? (tone === 'low' ? 'hsl(var(--destructive))' : tone === 'high' ? 'hsl(var(--success))' : 'hsl(var(--accent-warm))') : arrowColor(a.receivedPoints);
        const width = isHighlighted ? 2.2 : 1.4;

        // arrow head
        const headLen = Math.min(5, len * 0.5);
        const headW = headLen * 0.62;
        const px = -uy;
        const py = ux;
        const bx = x2 - ux * headLen;
        const by = y2 - uy * headLen;
        const head = `${x2},${y2} ${bx + px * headW},${by + py * headW} ${bx - px * headW},${by - py * headW}`;

        return (
          <g
            key={`${a.fromOpinionId}-${a.toOpinionId}-${i}`}
            style={{ opacity }}
            className="cursor-pointer transition-opacity duration-200"
            onClick={(event) => handleClick(event, a)}
          >
            {isHighlighted && (
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={width * 3}
                strokeOpacity={0.2}
                strokeLinecap="round"
              />
            )}
            {ratingEvent && (
              <motion.line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth={width * 2} strokeLinecap="round"
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.35, 0] }}
                transition={{ duration: 2.4 }}
              />
            )}
            <line
              x1={x1} y1={y1} x2={bx} y2={by}
              stroke={color}
              strokeWidth={width}
              strokeLinecap="round"
            />
            <polygon points={head} fill={color} />
          </g>
        );
      })}
    </g>
  );
}
