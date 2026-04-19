import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function TTNotificationsBell({ hasUnread = false }: { hasUnread?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-[8.5rem] left-3 z-20 h-10 w-10 rounded-full bg-background/85 backdrop-blur-md border border-border/40 shadow-md flex items-center justify-center"
        aria-label={t('tt.notifications')}
      >
        <Bell className="w-4 h-4 text-foreground/80" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <h2 className="font-semibold mb-3">{t('tt.notifications')}</h2>
          <p className="text-sm text-muted-foreground">{t('tt.noNotifications')}</p>
        </SheetContent>
      </Sheet>
    </>
  );
}
