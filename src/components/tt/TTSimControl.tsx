import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { GRAPH_ANIMATION } from '@/lib/graph-animation';
import { Clock3 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const LOOP_SECONDS = 72 * 60 * 60;

/**
 * Keeps the permanent /sim replay caught up while someone is watching.
 * The server places every event at its fixed loop time, so all visitors see
 * the same discussion no matter who triggered the catch-up. Displays the last
 * server-confirmed frame, never a client clock that could run ahead of the data.
 */
export function TTSimControl({ topicId, compact = false, dataset = 'social' }: { topicId: string; compact?: boolean; dataset?: 'social' | 'august' }) {
  const { t } = useTranslation();
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    if (!topicId) return;
    let alive = true;
    const timers = new Set<number>();
    const nextChatFlight = new Map<string, number>();
    const tick = () => {
      if (document.visibilityState === 'visible') {
        supabase.functions.invoke('sim-replay', { body: { dataset } }).then(({ data, error }) => {
          if (alive && data?.busy) { const retry = window.setTimeout(() => { timers.delete(retry); tick(); }, 1500); timers.add(retry); }
           if (alive && !error && !data?.busy && Number.isFinite(data?.frame)) {
            setFrame(data.frame);
            const events = Array.isArray(data?.events) ? data.events as Array<Record<string, unknown>> : [];
            events.slice(0, 12).forEach((item, index) => {
              const now = Date.now();
              const chatId = item.type === 'message' ? String(item.chatId) : null;
              const startsAt = Math.max(now + index * 850, chatId ? nextChatFlight.get(chatId) ?? 0 : 0);
              if (chatId) nextChatFlight.set(chatId, startsAt + GRAPH_ANIMATION.messageMaxMs + 5000);
              const timer = window.setTimeout(() => {
                timers.delete(timer);
                if (!alive) return;
                window.dispatchEvent(new CustomEvent('tt:sim-events', { detail: { topicId, events: [item] } }));
              }, startsAt - now);
              timers.add(timer);
            });
          }
        }).catch(() => {});
      }
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => { alive = false; window.clearInterval(id); timers.forEach(window.clearTimeout); };
  }, [topicId, dataset]);
  const hour = Math.min(72, Math.floor((frame ?? 0) / 3600) + 1);
  const label = frame === null ? t('replay.loading') : t('replay.simHour', { hour });
  const [before, after = ''] = t('replay.simHour', { hour: '\u0001' }).split('\u0001');

  return (
    <div
      className={`absolute inset-x-4 ${compact ? 'bottom-[8px]' : 'bottom-[55px]'} z-[41] h-7 pointer-events-none`}
      data-sim-frame={frame ?? undefined}
      data-sim-loop={LOOP_SECONDS}
      role="status"
      aria-label={label}
      aria-busy={frame === null}
      title={label}
    >
      <span className="absolute right-0 bottom-1 inline-flex items-center gap-1 text-[10px] leading-3 text-foreground/75 tabular-nums">
        <Clock3 className="h-3 w-3" />
        {frame === null ? label : <span aria-hidden>{before}<RollingNumber value={hour} />{after}</span>}
      </span>
    </div>
  );
}

/** Counts through every hour between the shown and the confirmed value, each digit sliding in. */
function RollingNumber({ value }: { value: number }) {
  // Starts at hour 1 so the counter visibly runs up to the confirmed hour on load.
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown === value) return;
    const step = value > shown ? 1 : -1;
    const distance = Math.abs(value - shown);
    const id = window.setTimeout(() => setShown((current) => current + step), Math.max(40, Math.min(160, 900 / distance)));
    return () => window.clearTimeout(id);
  }, [shown, value]);
  return (
    <span className="relative inline-flex overflow-hidden align-bottom" data-sim-hour={shown}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={shown}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="inline-block"
        >
          {shown}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
