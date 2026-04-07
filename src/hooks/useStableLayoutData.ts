import { useRef, useState, useEffect } from 'react';
import { Opinion, ChatRating } from '@/types/graph';

/**
 * Buffers layout inputs (opinions + ratings) behind a 60-second cooldown.
 * Real-time data fetching continues normally; only the snapshot fed to
 * calculateLayout is delayed until the cooldown elapses.
 */
export function useStableLayoutData(
  opinions: Opinion[] | undefined,
  ratings: ChatRating[] | undefined,
) {
  const DEBOUNCE_MS = 60_000; // 60 seconds

  const [stableOpinions, setStableOpinions] = useState<Opinion[]>([]);
  const [stableRatings, setStableRatings] = useState<ChatRating[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingOpinions = useRef<Opinion[]>([]);
  const pendingRatings = useRef<ChatRating[]>([]);
  const hasInitialized = useRef(false);

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => {
    const newOpinions = opinions ?? [];
    const newRatings = ratings ?? [];

    // First load — apply immediately, no debounce
    if (!hasInitialized.current && newOpinions.length > 0) {
      hasInitialized.current = true;
      setStableOpinions(newOpinions);
      setStableRatings(newRatings);
      return;
    }

    // Check if data actually changed (by length + ids as a cheap heuristic)
    const opsKey = newOpinions.map(o => o.id).join(',');
    const stableOpsKey = stableOpinions.map(o => o.id).join(',');
    const ratKey = newRatings.length.toString();
    const stableRatKey = stableRatings.length.toString();

    const changed = opsKey !== stableOpsKey || ratKey !== stableRatKey ||
      JSON.stringify(newRatings) !== JSON.stringify(stableRatings);

    if (!changed) return;

    // Buffer the new data
    pendingOpinions.current = newOpinions;
    pendingRatings.current = newRatings;

    // Reset timers on every change
    clearTimers();

    // Start countdown
    const totalSeconds = Math.ceil(DEBOUNCE_MS / 1000);
    setSecondsRemaining(totalSeconds);

    intervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      setStableOpinions(pendingOpinions.current);
      setStableRatings(pendingRatings.current);
      setSecondsRemaining(0);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }, DEBOUNCE_MS);

    return () => {
      clearTimers();
    };
  }, [opinions, ratings]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stableOpinions, stableRatings, secondsRemaining };
}
