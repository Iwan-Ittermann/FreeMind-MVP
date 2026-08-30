import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Slim notice for the two non-event topics:
 *  - sandbox: everything here is a playground, data may be reset
 *  - archive: the August discussion, read-only
 * Sits above the bottom navigation so nothing overlaps.
 */
export function TTModeNotice({ mode }: { mode: 'sandbox' | 'archive' }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const text =
    mode === 'sandbox'
      ? t(
          'tt.sandboxNotice',
          'Sandbox: a playground to try freemind. Bots A, B and C will disagree with you — rate how respectful they are.',
        )
      : t(
          'tt.archiveNotice',
          'Archive: the August discussion has ended. You can read everything, but not take part.',
        );

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[150px] z-30 w-[calc(100%-1.5rem)] max-w-[420px] pointer-events-auto">
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
