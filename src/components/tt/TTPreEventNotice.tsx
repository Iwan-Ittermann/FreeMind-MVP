import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Clock3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TTPreEventNotice({ startsAt, now, registered, embedded = false, compact = false, august = false }: { august?: boolean; startsAt: Date | null; now: number; registered: boolean; embedded?: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const remaining = Math.max(0, (startsAt?.getTime() ?? now) - now);
  const countdown = startsAt ? t('replay.startsIn', {
    days: Math.floor(remaining / 86400000), hours: Math.floor(remaining % 86400000 / 3600000), minutes: Math.floor(remaining % 3600000 / 60000),
  }) : t('replay.startPending');
  if (dismissed) return null;
  return <>
    {/* Compact (watching an embed): a slim pill in the bottom row beside the hour label, below the graph. */}
    <div data-pre-event-notice className={compact
      ? 'absolute left-3 right-[112px] bottom-[6px] z-20 flex w-fit max-w-[calc(100%-124px)] flex-wrap items-center gap-x-1.5 gap-y-0 rounded-2xl border border-border/40 bg-background/80 py-0.5 pl-2.5 pr-0.5 text-[10px] leading-4 text-muted-foreground'
      : 'absolute inset-x-3 bottom-[94px] z-20 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border border-border/40 bg-background/85 px-3 py-2 text-[10px] text-muted-foreground'} role="status">
      <span className="inline-flex items-center gap-1 tabular-nums">{!compact && <Clock3 className="h-3 w-3 shrink-0" />}{countdown}</span>
      {!registered && <Button asChild variant="link" className="h-auto p-0 text-[10px] text-foreground underline underline-offset-2"><a href="/wedium#cta" target={embedded ? '_top' : undefined}>{t('replay.registerNow')}</a></Button>}
      <Button variant="ghost" size="icon-sm" className={compact ? 'h-5 w-5 shrink-0' : 'h-6 w-6 shrink-0'} aria-label={t('common.close')} onClick={() => setDismissed(true)}><X className="h-3 w-3" /></Button>
    </div>
  </>;
}