import { useCallback, useEffect, useRef, useState } from 'react';
import type { Opinion, GraphNode } from '@/types/graph';
import { BOT_USER_ID } from '@/lib/constants';

export const TT_TOUR_MAX_RATINGS = 4;

const doneKey = (topicId: string) => `tt:positioning-tour-done:${topicId}`;

interface UseTTPositioningTourArgs {
  topicId: string;
  opinions: Opinion[];
  ownOpinionId: string | null;
  hasOwnOpinion: boolean;
  ownOpinionKnown: boolean;
  onSelectNode: (node: GraphNode | null) => void;
}

export function useTTPositioningTour({
  topicId,
  opinions,
  ownOpinionId,
  hasOwnOpinion,
  ownOpinionKnown,
  onSelectNode,
}: UseTTPositioningTourArgs) {
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const prevHasOwnRef = useRef<boolean | null>(null);

  // Trigger congrats modal exactly when hasOwnOpinion flips false -> true
  useEffect(() => {
    if (!ownOpinionKnown) return;
    const prev = prevHasOwnRef.current;
    prevHasOwnRef.current = hasOwnOpinion;
    if (prev === false && hasOwnOpinion) {
      try {
        if (localStorage.getItem(doneKey(topicId)) === 'true') return;
      } catch { /* ignore */ }
      // Slight delay so the new node animates in first
      const id = window.setTimeout(() => setCongratsOpen(true), 1200);
      return () => window.clearTimeout(id);
    }
  }, [hasOwnOpinion, ownOpinionKnown, topicId]);

  // Reset on topic change
  useEffect(() => {
    setActive(false);
    setCongratsOpen(false);
    seenRef.current = new Set();
    setSeenIds(new Set());
    prevHasOwnRef.current = ownOpinionKnown ? hasOwnOpinion : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const pickRandom = useCallback((exclude: Set<string>): Opinion | null => {
    const candidates = opinions.filter(
      (op) =>
        op.id !== ownOpinionId &&
        op.authorId !== BOT_USER_ID &&
        !exclude.has(op.id) &&
        op.visible !== false,
    );
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, [opinions, ownOpinionId]);

  const finish = useCallback(() => {
    setActive(false);
    setCongratsOpen(false);
    try { localStorage.setItem(doneKey(topicId), 'true'); } catch { /* ignore */ }
    onSelectNode(null);
  }, [topicId, onSelectNode]);

  const start = useCallback(() => {
    setCongratsOpen(false);
    seenRef.current = new Set();
    const op = pickRandom(seenRef.current);
    if (!op) { finish(); return; }
    seenRef.current.add(op.id);
    setSeenIds(new Set(seenRef.current));
    setActive(true);
    onSelectNode({ id: op.id, x: 0, y: 0, opinion: op } as unknown as GraphNode);
  }, [pickRandom, finish, onSelectNode]);

  const next = useCallback(() => {
    if (seenRef.current.size >= TT_TOUR_MAX_RATINGS) { finish(); return; }
    const op = pickRandom(seenRef.current);
    if (!op) { finish(); return; }
    seenRef.current.add(op.id);
    setSeenIds(new Set(seenRef.current));
    onSelectNode({ id: op.id, x: 0, y: 0, opinion: op } as unknown as GraphNode);
  }, [pickRandom, finish, onSelectNode]);

  const canContinue =
    seenIds.size < TT_TOUR_MAX_RATINGS &&
    opinions.some(
      (op) =>
        op.id !== ownOpinionId &&
        op.authorId !== BOT_USER_ID &&
        !seenIds.has(op.id) &&
        op.visible !== false,
    );

  return {
    congratsOpen,
    setCongratsOpen,
    active,
    canContinue,
    start,
    next,
    stop: finish,
  };
}
