import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { GRAPH_ANIMATION } from '@/lib/graph-animation';
import { Clock3 } from 'lucide-react';

const LOOP_SECONDS = 72 * 60 * 60;

/**
 * Keeps the permanent /sim replay caught up while someone is watching.
 * The server places every event at its fixed loop time, so all visitors see
 * the same discussion no matter who triggered the catch-up. Displays the last
 * server-confirmed frame, never a client clock that could run ahead of the data.
 */
export function TTSimControl({ topicId }: { topicId: string }) {
  const { t } = useTranslation();
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    if (!topicId) return;
    let alive = true;
    const timers = new Set<number>();
    const nextChatFlight = new Map<string, number>();
    const tick = () => {
      if (document.visibilityState === 'visible') {
        supabase.functions.invoke('sim-replay', { body: {} }).then(({ data, error }) => {
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
  }, [topicId]);
  const progress = Math.min(1, Math.max(0, (frame ?? 0) / LOOP_SECONDS));
  const day = Math.floor((frame ?? 0) / 86400) + 1;
  const hour = Math.floor(((frame ?? 0) % 86400) / 3600);
  const label = frame === null ? t('replay.loading') : t('replay.simClock', { day, hour });

  return (
    <div
      className="absolute inset-x-4 bottom-[55px] z-[41] h-7 pointer-events-none"
      data-sim-frame={frame ?? undefined}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={LOOP_SECONDS}
      aria-valuenow={frame ?? undefined}
      aria-valuetext={label}
      aria-busy={frame === null}
      title={label}
    >
      <span className="absolute right-0 top-0 inline-flex items-center gap-1 text-[10px] leading-3 text-foreground/75 tabular-nums"><Clock3 className="h-3 w-3" />{label}</span>
      <div className="absolute inset-x-0 bottom-1 h-px bg-foreground/75" />
      {frame !== null && <div
        className="absolute bottom-1 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-destructive shadow-sm"
        style={{ left: `${progress * 100}%` }}
      />}
    </div>
  );
}
