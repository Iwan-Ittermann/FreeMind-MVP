import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

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
          if (alive && !error && !data?.busy && Number.isFinite(data?.frame)) setFrame(data.frame);
        }).catch(() => {});
      }
    };
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  if (frame === null) return null;
  const day = Math.floor(frame / 86400) + 1;
  // The established loop starts at 18:00 UTC; show the corresponding clock time.
  const seconds = (frame + 18 * 3600) % 86400;
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
  return <div className="absolute right-3 bottom-0 z-40 flex h-7 items-center gap-1.5 text-[10px] text-muted-foreground pointer-events-none" data-sim-frame={frame}>
    <span>{t('replay.simTime')}</span><time className="tabular-nums">{t('replay.simDayTime', { day, time })}</time>
  </div>;
}
