import { Bell, BellOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getPrefs, setPrefs } from '@/lib/tt-notification-prefs';

interface TTNotificationsBellProps {
  topicId: string;
}

/** Per-topic notification subscription toggle. */
export function TTNotificationsBell({ topicId }: TTNotificationsBellProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(!!getPrefs(topicId)?.enabled);
    sync();
    window.addEventListener('tt:subscription-changed', sync);
    return () => window.removeEventListener('tt:subscription-changed', sync);
  }, [topicId]);

  const toggle = () => {
    const next = !enabled;
    setPrefs(topicId, { enabled: next });
    setEnabled(next);
    toast.success(next ? t('tt.notifyOn') : t('tt.notifyOff'));
    window.dispatchEvent(
      new CustomEvent('tt:subscription-changed', {
        detail: { topicId, enabled: next },
      }),
    );
  };

  return (
    <div className="pointer-events-auto absolute bottom-[8.5rem] left-3 z-40 flex flex-col gap-1.5">
      <button
        onClick={toggle}
        className={`h-12 w-12 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center transition-colors ${
          enabled
            ? 'bg-primary/90 border-primary/60 text-primary-foreground'
            : 'bg-background/85 border-border/40 text-foreground/70 hover:text-foreground'
        }`}
        aria-label={enabled ? t('tt.notifyOff') : t('tt.notifyOn')}
        title={enabled ? t('tt.subscribed') : t('tt.notSubscribed')}
      >
        {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
      </button>
    </div>
  );
}
