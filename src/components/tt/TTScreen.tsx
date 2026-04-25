import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { MotionValue } from 'framer-motion';
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
  isLoopClone?: boolean;
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
  isLoopClone = false,
}: TTScreenInnerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, activeChats, messageAnimations } = useTopicData(topicId);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number>(0);
  const [viewportW, setViewportW] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const next = Math.round(Math.min(rect.width, rect.height));
      if (next > 0) setSize(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Convert background landmarks (viewport units) to graph-SVG px.
  // Background SVG is sized so the blue ring (r=300 of viewBox 1000) spans 100vw,
  // so 1 viewBox unit = (viewportW / 600) px. Landmarks in graph coords = the SAME
  // pixel distance because the graph SVG is rendered 1:1 at size × size.
  // Rcore = 140 viewBox-units → coreR_vw ≈ 23.33vw → (140/600) × viewportW px
  // Rblue = 300 → 50vw → (300/600) × viewportW
  // Rwhite = 360 → 60vw → (360/600) × viewportW
  const ttLandmarks = useMemo(() => {
    if (!viewportW) return undefined;
    return {
      coreR: (140 / 600) * viewportW,
      blueR: (300 / 600) * viewportW,
      whiteR: (360 / 600) * viewportW,
    };
  }, [viewportW]);

  const ownOpinionId = user
    ? data?.opinions.find((o) => o.authorId === user.id)?.id ?? null
    : null;

  return (
    <section
      data-tt-topic={topicId}
      data-tt-real-topic={isLoopClone ? undefined : topicId}
      data-tt-clone={isLoopClone ? 'true' : undefined}
      className="relative w-full h-[100dvh] snap-start snap-always overflow-visible"
      style={{ contain: 'layout size', backgroundColor: '#eef2f4', transform: 'translateZ(0)' }}
    >
      {/* Full-bleed background, sized so the blue ring spans the viewport width.
          Lives outside the graph wrapper so it isn't clipped. */}
      <TTBackground hue={hue} />

      {/* Zone labels — positioned relative to the section center using viewport
          units so they align with the background's blue/white ring landmarks. */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Respektvoll — exact center (dark core) */}
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/70 font-medium"
          style={{ top: '50%' }}
        >
          {t('tt.respectful')}
        </span>
        {/* Moderat — inside the blue ring, above center */}
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-medium"
          style={{ top: 'calc(50% - 35vw)' }}
        >
          {t('tt.moderate')}
        </span>
        {/* Extrem — outside the white ring, below */}
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/30 font-medium"
          style={{ top: 'calc(50% + 62vw)' }}
        >
          {t('tt.extreme')}
        </span>
      </div>

      {/* Graph stays centered in its own square wrapper. Both the background's
          dark core and this wrapper are centered on the section, so they align. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center overflow-visible">
        <div
          ref={wrapperRef}
          className="relative overflow-visible"
          style={{
            width: 'min(85vmin, 480px)',
            height: 'min(85vmin, 480px)',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Graph layer — sized to match wrapper so SVG center aligns with background center */}
          {size > 0 && ttLandmarks && (
            <div data-tt-graph className="absolute inset-0 flex items-center justify-center overflow-visible will-change-transform">
              <OpinionGraph
                opinions={data?.opinions ?? []}
                ratings={data?.ratings ?? []}
                activeChats={activeChats}
                messageAnimations={messageAnimations}
                currentUserId={user?.id}
                currentUserOpinionId={ownOpinionId}
                onNodeSelect={onNodeSelect}
                selectedNodeId={selectedNodeId}
                width={size}
                height={size}
                showLabels="none"
                chrome="naked"
                ttMode
                ttLandmarks={ttLandmarks}
              />
            </div>
          )}
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
