import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function TTPreEventNotice({ startsAt, now, registered, suppressPopup = false }: { startsAt: Date | null; now: number; registered: boolean; suppressPopup?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (registered || suppressPopup) return;
    try { if (sessionStorage.getItem('event-registration-seen')) return; } catch { /* storage optional */ }
    const timer = window.setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem('event-registration-seen', 'true'); } catch { /* storage optional */ }
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [registered, suppressPopup]);
  const remaining = Math.max(0, (startsAt?.getTime() ?? now) - now);
  const countdown = startsAt ? t('replay.startsIn', {
    days: Math.floor(remaining / 86400000), hours: Math.floor(remaining % 86400000 / 3600000), minutes: Math.floor(remaining % 3600000 / 60000),
  }) : t('replay.startPending');
  return <>
    <div className="absolute inset-x-3 bottom-[94px] z-20 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md border border-border/40 bg-background/85 px-3 py-2 text-[10px] text-muted-foreground" role="status">
      <span>{t('replay.preview')}</span><span aria-hidden>·</span><span className="inline-flex items-center gap-1 tabular-nums"><Clock3 className="h-3 w-3" />{countdown}</span>
    </div>
    <Dialog open={open && !registered} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[360px] rounded-lg">
        <DialogTitle>{t('replay.registerTitle')}</DialogTitle>
        <DialogDescription>{t('replay.registerBody')}</DialogDescription>
        <Button asChild><Link to="/wedium#cta">{t('replay.register')}</Link></Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>{t('replay.later')}</Button>
      </DialogContent>
    </Dialog>
  </>;
}