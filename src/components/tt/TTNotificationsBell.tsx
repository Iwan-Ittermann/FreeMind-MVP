import { Bell, BellOff, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TTNotificationSetup } from './TTNotificationSetup';
import { getPrefs, setPrefs, removePrefs } from '@/lib/tt-notification-prefs';

interface TTNotificationsBellProps {
  topicId: string;
}

/**
 * Notification subscription bell (left side of graph).
 *
 * - First tap (no prefs): opens the setup modal with explanation + filter picker.
 * - Subsequent taps: toggle on/off.
 * - Long-press or gear icon: re-open filter settings.
 */
export function TTNotificationsBell({ topicId }: TTNotificationsBellProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    setEnabled(!!getPrefs(topicId)?.enabled);
  }, [topicId]);

  const toggle = () => {
    const prefs = getPrefs(topicId);

    if (!prefs) {
      // First time — show setup modal
      setSetupOpen(true);
      return;
    }

    const next = !enabled;
    if (next) {
      // Re-enable with existing filters
      setPrefs(topicId, { ...prefs, enabled: true });
    } else {
      setPrefs(topicId, { ...prefs, enabled: false });
    }
    setEnabled(next);
    toast.success(next ? t('tt.notifyOn') : t('tt.notifyOff'));
    window.dispatchEvent(
      new CustomEvent('tt:subscription-changed', {
        detail: { topicId, enabled: next },
      }),
    );
  };

  return (
    <>
      <div className="absolute bottom-[8.5rem] left-3 z-20 flex flex-col gap-1.5">
        <button
          onClick={toggle}
          className={`h-10 w-10 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center transition-colors ${
            enabled
              ? 'bg-primary/90 border-primary/60 text-primary-foreground'
              : 'bg-background/85 border-border/40 text-foreground/70 hover:text-foreground'
          }`}
          aria-label={enabled ? t('tt.notifyOff') : t('tt.notifyOn')}
          title={enabled ? t('tt.subscribed') : t('tt.notSubscribed')}
        >
          {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>

        {/* Settings gear — only visible when subscribed */}
        {enabled && (
          <button
            onClick={() => setSetupOpen(true)}
            className="h-8 w-8 mx-auto rounded-full backdrop-blur-md bg-background/70 border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('tt.notifSetup.title')}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <TTNotificationSetup
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        topicId={topicId}
        onEnabled={() => setEnabled(true)}
      />
    </>
  );
}
