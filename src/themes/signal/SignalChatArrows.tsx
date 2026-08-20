import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { GraphNode } from '@/types/graph';
import { ChatArrow } from '@/hooks/useChatArrows';

interface SignalChatArrowsProps {
  arrows: readonly ChatArrow[];
  nodeMap: ReadonlyMap<string, GraphNode>;
  nodeRadius: number;
  highlightedNode: string | null;
  onArrowClick?: (sourceId: string, targetId: string) => void;
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

/** Cool/dim (few points) → cyan → warm/bright (many points). */
function arrowColor(points: number | null, maxPoints: number): string {
  if (points == null) return '#8895b3';
  const t = maxPoints > 0 ? Math.min(1, points / maxPoints) : 0;
  if (t < 0.5) {
    const k = t / 0.5;
    // deep blue → cyan
    const r = Math.round(46 + k * (0 - 46));
    const g = Math.round(90 + k * (212 - 90));
    const b = Math.round(180 + k * (255 - 180));
    return `rgb(${r},${g},${b})`;
  }
  const k = (t - 0.5) / 0.5;
  // cyan → warm amber
  const r = Math.round(0 + k * 255);
  const g = Math.round(212 + k * (196 - 212));
  const b = Math.round(255 + k * (110 - 255));
  return `rgb(${r},${g},${b})`;
}

export function SignalChatArrows({
  arrows, nodeMap, nodeRadius, highlightedNode, onArrowClick,
}: SignalChatArrowsProps) {
  const maxPoints = useMemo(() => {
    let max = 0;
    for (const a of arrows) if (a.receivedPoints != null && a.receivedPoints > max) max = a.receivedPoints;
    return max;
  }, [arrows]);

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
        const color = arrowColor(a.receivedPoints, maxPoints);
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
