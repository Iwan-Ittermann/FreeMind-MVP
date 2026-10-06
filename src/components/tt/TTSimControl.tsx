import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const LOOP_SECONDS = 72 * 60 * 60;

/**
 * Keeps the permanent /sim replay caught up while someone is watching.
 * The server places every event at its fixed loop time, so all visitors see
 * the same discussion no matter who triggered the catch-up. Displays the last
 * server-confirmed frame, never a client clock that could run ahead of the data.
 */
export function TTSimControl() {
  const { t } = useTranslation();
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (document.visibilityState === 'visible') {
        supabase.functions.invoke('sim-replay', { body: {} }).then(({ data, error }) => {
          if (alive && !error && Number.isFinite(data?.frame)) setFrame(data.frame);
        }).catch(() => {});
      }
    };
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  if (frame === null) return null;
  const progress = Math.min(1, Math.max(0, frame / LOOP_SECONDS));
  const hour = Math.min(72, Math.floor(frame / 3600) + 1);
  const label = `${t('replay.simTime')}: ${t('replay.simHour', { hour })}`;

  return (
    <div
      className="absolute inset-x-4 bottom-[23px] z-[41] h-3 pointer-events-none"
      data-sim-frame={frame}
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={72}
      aria-valuenow={hour}
      title={label}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/75" />
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive shadow-sm"
        style={{ left: `${progress * 100}%` }}
      />
    </div>
  );
}
