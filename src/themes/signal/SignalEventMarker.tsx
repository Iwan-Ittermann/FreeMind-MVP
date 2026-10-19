import { memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Smile, Meh, Frown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SemanticEventToken } from '../types';
import type { MessageAnimationData } from '@/hooks/useTopicData';
import { GRAPH_ANIMATION, respectTone, truncateAtWord, messageBubblePosition } from '@/lib/graph-animation';
import { OPINION_DIFFERENCE_STEPS, opinionDifferenceIndex } from '@/lib/opinion-difference';
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
  const visible = events;
  const dataByKey = new Map(messageAnimations.map(item => [`${item.sourceOpinionId}-${item.targetOpinionId}-${item.timestamp}`, item]));

  return (
    <g className="signal-events">
      <AnimatePresence>
        {visible.map((evt, i) => {
          const key = `${evt.sourceId}-${evt.targetId}-${evt.timestamp}`;
          const item = dataByKey.get(key);
          const opinionRating = item?.kind === 'difference_rating';
          const rating = item?.kind === 'rating' || opinionRating;
          const tone = respectTone(item?.respect);
          const color = tone === 'low' ? 'hsl(var(--destructive))' : tone === 'high' ? 'hsl(var(--success))' : 'hsl(var(--accent-warm))';
          const duration = (item?.durationMs ?? GRAPH_ANIMATION.messageMinMs) / 1000;
          const text = item?.content ? truncateAtWord(item.content, 92) : '';
           const from = messageBubblePosition(evt.sourceX, evt.sourceY, width ?? 600, height ?? 600);
           const to = messageBubblePosition(evt.targetX, evt.targetY, width ?? 600, height ?? 600);
          const difference = item?.disagreement ?? differences?.get(`${evt.sourceId}|${evt.targetId}`);
           const differenceStep = difference == null ? null : OPINION_DIFFERENCE_STEPS[opinionDifferenceIndex(difference)];
           const DifferenceIcon = differenceStep?.Icon;
          const RespectIcon = tone === 'high' ? Smile : tone === 'low' ? Frown : Meh;
           const differenceColor = differenceStep?.tone === 'disagree' ? 'hsl(var(--destructive))' : differenceStep?.tone === 'agree' ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))';
          const chipWidth = opinionRating || !DifferenceIcon ? 26 : 44;
          const reactionX = Math.max(chipWidth / 2 + 4, Math.min((width ?? Infinity) - chipWidth / 2 - 4, evt.sourceX));
          const reactionY = Math.max(16, Math.min((height ?? Infinity) - 16, evt.sourceY + (evt.sourceY < 60 ? 34 : -34)));
           return <motion.g key={item?.id ?? `${key}-${i}`} pointerEvents="none">
          <motion.line x1={evt.sourceX} y1={evt.sourceY} x2={evt.targetX} y2={evt.targetY}
            stroke={opinionRating ? differenceColor : rating ? color : 'hsl(var(--foreground) / 0.7)'} strokeWidth={rating ? 1.5 : 2} strokeLinecap="round"
             data-rating-edge={opinionRating ? evt.sourceId : undefined}
             initial={{ opacity: 0 }} animate={{ opacity: [0, opinionRating ? 0.85 : rating ? 0.45 : 0.9, 0] }} transition={{ duration: opinionRating ? 0.55 : duration }} />
          {rating && <motion.g
            data-rating-reaction={evt.sourceId}
            data-rating-kind={opinionRating ? 'difference' : 'respect'}
            transform={`translate(${reactionX}, ${reactionY})`}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration, times: [0, 0.12, 0.8, 1] }}
          >
            <title>{opinionRating ? t('tt.opinionDifferenceLabel') : t('tt.understandingLabel')}{!opinionRating && difference != null ? ` · ${t('tt.opinionDifferenceLabel')}` : ''}</title>
            <rect x={-chipWidth / 2} y={-12} width={chipWidth} height={24} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--border))" />
            {DifferenceIcon && <DifferenceIcon x={opinionRating ? -7 : -18} y={-7} width={14} height={14} stroke={differenceColor} />}
            {!opinionRating && <RespectIcon x={DifferenceIcon ? 3 : -7} y={-7} width={14} height={14} stroke={color} />}
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
               data-message-flight={item?.id}
               initial={{ x: from.x, y: from.y, opacity: 0 }}
               animate={{ x: to.x, y: to.y, opacity: [0, 1, 1, 0] }}
              transition={{ duration, ease: 'easeInOut' }}
            >
               <SignalTextBubble text={text} maxWidth={from.maxWidth} anchor="center" below />
            </motion.g>
          )}
          </motion.g>;
        })}
      </AnimatePresence>
    </g>
  );
});
