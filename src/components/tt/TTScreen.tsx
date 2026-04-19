import { memo, useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { useTopicData } from '@/hooks/useTopicData';
import { useAuth } from '@/hooks/useAuth';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { TTBackground } from './TTBackground';
import { useTranslation } from 'react-i18next';
import { GraphNode } from '@/types/graph';

interface TTScreenInnerProps {
  topicId: string;
  hue?: number;
  /** Provided by parent scroll container. Used for parallax. */
  scrollYProgress?: MotionValue<number>;
  /** Section index (0 = first in window). */
  index?: number;
  selectedNodeId: string | null;
  onNodeSelect: (node: GraphNode | null) => void;
  /** Called from parent so it can read opinions for the side panel. */
  onDataReady?: (data: ReturnType<typeof useTopicData>['data']) => void;
}

/**
 * Inner TT section: background + graph only. No chrome (header/tabs/panel).
 * Chrome lives in the parent (`TT.tsx`) so it never unmounts on swipe.
 *
 * Parallax: the graph layer translates at ~0.7x of the section's scroll
 * progress, while the background stays stationary. Result: subtle depth
 * without the GUI shaking.
 */
function TTScreenInnerImpl({
  topicId,
  hue = 0,
  selectedNodeId,
  onNodeSelect,
}: TTScreenInnerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, activeChats, messageAnimations } = useTopicData(topicId);
  const sectionRef = useRef<HTMLElement>(null);

  const ownOpinionId = user
    ? data?.opinions.find((o) => o.authorId === user.id)?.id ?? null
    : null;

  // Parallax: track this section's progress through the viewport
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  // Graph slides slower than background → parallax effect.
  const graphY = useTransform(scrollYProgress, [0, 1], ['4%', '-4%']);

  return (
    <section
      ref={sectionRef}
      data-tt-topic={topicId}
      className="relative w-full h-[100dvh] snap-start overflow-hidden bg-black"
      style={{ contain: 'layout paint' }}
    >
      <TTBackground hue={hue} />

      {/* Graph overlay — centered, with parallax translate */}
      <motion.div
        style={{ y: graphY, willChange: 'transform' }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          data-tt-graph
          className="pointer-events-auto"
          style={{ width: '85vmin', height: '85vmin', maxWidth: 480, maxHeight: 480 }}
        >
          <OpinionGraph
            opinions={data?.opinions ?? []}
            ratings={data?.ratings ?? []}
            activeChats={activeChats}
            messageAnimations={messageAnimations}
            currentUserId={user?.id}
            currentUserOpinionId={ownOpinionId}
            onNodeSelect={onNodeSelect}
            selectedNodeId={selectedNodeId}
            width={480}
            height={480}
            showLabels="none"
          />
        </div>
      </motion.div>

      {/* Zone labels (decorative) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[85vmin] h-[85vmin] max-w-[480px] max-h-[480px]">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/70 font-medium">
            {t('tt.respectful')}
          </span>
          <span className="absolute left-1/2 top-[18%] -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-medium">
            {t('tt.moderate')}
          </span>
          <span className="absolute left-1/2 bottom-[2%] -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/30 font-medium">
            {t('tt.extreme')}
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Memoized so re-renders of sibling sections (during swipe) don't cascade.
 */
export const TTScreenInner = memo(TTScreenInnerImpl, (prev, next) => {
  return (
    prev.topicId === next.topicId &&
    prev.selectedNodeId === next.selectedNodeId &&
    prev.hue === next.hue
  );
});

// Backwards compatibility — no other route uses TTScreen, but keep the named export.
export const TTScreen = TTScreenInner;
