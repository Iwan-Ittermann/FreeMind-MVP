import { Bell, BellOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface TTNotificationsBellProps {
  topicId: string;
}

const STORAGE_KEY = 'tt:in-app-subscriptions';

function readSubs(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * In-app notification subscription toggle.
 * - When enabled, the user's TT notifications panel (header bell) will
 *   surface new opinions / chat requests / accepted requests / messages
 *   for this topic.
 * - This is NOT a browser notification opt-in.
 */
export function TTNotificationsBell({ topicId }: TTNotificationsBellProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!!readSubs()[topicId]);
  }, [topicId]);

  const toggle = () => {
    const subs = readSubs();
    const next = !enabled;
    if (next) subs[topicId] = true;
    else delete subs[topicId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    setEnabled(next);
    toast.success(next ? t('tt.notifyOn') : t('tt.notifyOff'));
    window.dispatchEvent(new CustomEvent('tt:subscription-changed', { detail: { topicId, enabled: next } }));
  };

  return (
    <button
      onClick={toggle}
      className={`absolute bottom-[8.5rem] left-3 z-20 h-10 w-10 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center transition-colors ${
        enabled
          ? 'bg-primary/90 border-primary/60 text-primary-foreground'
          : 'bg-background/85 border-border/40 text-foreground/70 hover:text-foreground'
      }`}
      aria-label={enabled ? t('tt.notifyOff') : t('tt.notifyOn')}
      title={enabled ? t('tt.subscribed') : t('tt.notSubscribed')}
    >
      {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
    </button>
  );
}
