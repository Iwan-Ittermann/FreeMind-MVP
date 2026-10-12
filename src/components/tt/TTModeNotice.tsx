import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const seenKey = (mode: string) => `tt:mode-notice-seen:${mode}`;

/**
 * Slim notice for the two non-event topics:
 *  - sandbox: everything here is a playground, data may be reset
 *  - archive: the August discussion, read-only
 *  - archive-open: the August discussion, reopened as a playground
 * Shown only once per device (per mode) and remembered in local storage.
 */
export function TTModeNotice({
  mode,
  offsetClass = 'bottom-[150px]',
}: {
  mode: 'sandbox' | 'archive' | 'archive-open' | 'sim' | 'sim-august';
  /** Vertical offset so the notice never overlaps the CTA above the nav bar. */
  offsetClass?: string;
}) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(seenKey(mode)) === 'true';
    } catch {
      return false;
    }
  });

  // Seeing it counts as seen — it never comes back on this device.
  useEffect(() => {
    if (dismissed) return;
    try {
      localStorage.setItem(seenKey(mode), 'true');
    } catch {
      /* ignore */
    }
  }, [mode, dismissed]);

  if (dismissed) return null;


  const text =
    mode === 'sim-august'
      ? t('replay.augustNotice')
      : mode === 'sim'
      ? t(
          'tt.simNotice',
          'Simulation: All participants here are AI personas. Press play and watch them discuss, chat and rate each other.',
        )
      : mode === 'archive-open'
      ? t(
          'tt.archiveOpenNotice',
          'This was the August discussion. It has ended — but you can join in now and use it like a live discussion.',
        )
      : mode === 'sandbox'
      ? t(
          'tt.sandboxNotice',
          'Sandbox: a playground to try freemind. Bots A, B and C will disagree with you — rate how respectful they are.',
        )
      : t(
          'tt.archiveNotice',
          'Archive: the August discussion has ended. You can read everything, but not take part.',
        );


  return (
    <div className={`absolute left-1/2 -translate-x-1/2 ${offsetClass} z-30 w-[calc(100%-1.5rem)] max-w-[420px] pointer-events-auto`}>
      <div className="relative flex items-start gap-2 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg px-3 py-2 pr-8">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
        <p className="text-[11px] leading-snug text-muted-foreground">{text}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-muted text-muted-foreground"
          aria-label={t('common.close', 'Close')}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
