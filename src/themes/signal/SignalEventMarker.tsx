import { memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, X, Minus, Smile, Meh, Frown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SemanticEventToken } from '../types';
import type { MessageAnimationData } from '@/hooks/useTopicData';
import { GRAPH_ANIMATION, respectTone, truncateAtWord } from '@/lib/graph-animation';
import { SignalTextBubble } from './SignalTextBubble';

interface SignalEventMarkerProps {
  events: readonly SemanticEventToken[];
  messageAnimations?: readonly MessageAnimationData[];
  differences?: ReadonlyMap<string, number>;
  width?: number;
  height?: number;
}

export const SignalEventMarker = memo(function SignalEventMarker({ events, messageAnimations = [], differences, width, height }: SignalEventMarkerProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const visible = events.slice(-GRAPH_ANIMATION.maxVisibleEvents);
  const dataByKey = new Map(messageAnimations.map(item => [`${item.sourceOpinionId}-${item.targetOpinionId}-${item.timestamp}`, item]));

  return (
    <g className="signal-events">
      <AnimatePresence>
        {visible.map((evt, i) => {
          const key = `${evt.sourceId}-${evt.targetId}-${evt.timestamp}`;
          const item = dataByKey.get(key);
          const rating = item?.kind === 'rating';
          const tone = respectTone(item?.respect);
          const color = tone === 'low' ? 'hsl(var(--destructive))' : tone === 'high' ? 'hsl(var(--success))' : 'hsl(var(--accent-warm))';
          const duration = (item?.durationMs ?? GRAPH_ANIMATION.messageMinMs) / 1000;
          const text = item?.content ? truncateAtWord(item.content, 92) : '';
          const anchor = evt.targetX >= evt.sourceX ? 'left' : 'right';
          const difference = differences?.get(`${evt.sourceId}|${evt.targetId}`);
          const DifferenceIcon = difference == null ? null : difference <= 2 ? Check : difference >= 8 ? X : Minus;
          const RespectIcon = tone === 'high' ? Smile : tone === 'low' ? Frown : Meh;
          const chipWidth = DifferenceIcon ? 44 : 26;
          const reactionX = Math.max(chipWidth / 2 + 4, Math.min((width ?? Infinity) - chipWidth / 2 - 4, evt.sourceX));
          const reactionY = Math.max(16, Math.min((height ?? Infinity) - 16, evt.sourceY + (evt.sourceY < 60 ? 34 : -34)));
          return <motion.g key={`${key}-${i}`} pointerEvents="none">
          <motion.line x1={evt.sourceX} y1={evt.sourceY} x2={evt.targetX} y2={evt.targetY}
            stroke={rating ? color : 'hsl(var(--foreground) / 0.7)'} strokeWidth={rating ? 1.5 : 2} strokeLinecap="round"
            initial={{ opacity: 0 }} animate={{ opacity: [0, rating ? 0.45 : 0.9, 0] }} transition={{ duration }} />
          {rating && <motion.g
            data-rating-reaction={evt.sourceId}
            transform={`translate(${reactionX}, ${reactionY})`}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration, times: [0, 0.12, 0.8, 1] }}
          >
            <title>{t('tt.understandingLabel')}{difference != null ? ` · ${t('tt.opinionDifferenceLabel')}` : ''}</title>
            <rect x={-chipWidth / 2} y={-12} width={chipWidth} height={24} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--border))" />
            {DifferenceIcon && <DifferenceIcon x={-18} y={-7} width={14} height={14} stroke={difference != null && difference >= 8 ? 'hsl(var(--destructive))' : difference != null && difference <= 2 ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'} />}
            <RespectIcon x={DifferenceIcon ? 3 : -7} y={-7} width={14} height={14} stroke={color} />
          </motion.g>}
          {!rating && <motion.circle
            r={4}
            fill={rating ? color : 'hsl(var(--primary))'}
            stroke={rating ? color : 'hsl(var(--primary))'
            }
            strokeWidth={1}
            initial={{ cx: evt.sourceX, cy: evt.sourceY, opacity: 0.9, scale: 1 }}
            animate={{
              cx: evt.targetX,
              cy: evt.targetY,
              opacity: [0.9, 1, 0],
              scale: [1, 1.5, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : duration, ease: 'easeInOut' }}
          />}
          {!rating && text && (
            <motion.g
              initial={{ x: evt.sourceX, y: evt.sourceY, opacity: 0 }}
              animate={{ x: evt.targetX, y: evt.targetY, opacity: [0, 1, 1, 0] }}
              transition={{ duration, ease: 'easeInOut' }}
            >
              <SignalTextBubble text={text} maxWidth={150} anchor={anchor} />
            </motion.g>
          )}
          </motion.g>;
        })}
      </AnimatePresence>
    </g>
  );
});
