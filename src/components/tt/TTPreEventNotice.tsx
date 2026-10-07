import { useTranslation } from 'react-i18next';
import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TTPreEventNotice({ startsAt, now, registered, embedded = false, compact = false }: { startsAt: Date | null; now: number; registered: boolean; embedded?: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const remaining = Math.max(0, (startsAt?.getTime() ?? now) - now);
  const countdown = startsAt ? t('replay.startsIn', {
    days: Math.floor(remaining / 86400000), hours: Math.floor(remaining % 86400000 / 3600000), minutes: Math.floor(remaining % 3600000 / 60000),
  }) : t('replay.startPending');
  return <>
    <div className={`absolute inset-x-3 ${compact ? 'bottom-[48px]' : 'bottom-[94px]'} z-20 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border border-border/40 bg-background/85 px-3 py-2 text-[10px] text-muted-foreground`} role="status">
      <span>{t('replay.preview')}</span><span aria-hidden>·</span><span className="inline-flex items-center gap-1 tabular-nums"><Clock3 className="h-3 w-3" />{countdown}</span>
      {!registered && <Button asChild variant="link" className="h-auto p-0 text-[10px] text-foreground underline underline-offset-2"><a href="/wedium#cta" target={embedded ? '_top' : undefined}>{t('replay.registerNow')}</a></Button>}
    </div>
  </>;
}