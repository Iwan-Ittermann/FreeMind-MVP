import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getPrefs, setPrefs } from '@/lib/tt-notification-prefs';

interface TTNotificationSetupProps {
  open: boolean;
  onClose: () => void;
  topicId: string;
  /** Called after permission granted and prefs saved */
  onEnabled: () => void;
}

/**
 * Simplified bottom sheet that only handles browser permission request.
 * Filter preferences have moved to the header notification panel.
 */
export function TTNotificationSetup({
  open,
  onClose,
  topicId,
  onEnabled,
}: TTNotificationSetupProps) {
  const { t } = useTranslation();

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const notificationUnavailable =
    !('Notification' in window) || isInIframe;

  const handleEnable = async () => {
    if (notificationUnavailable) {
      toast.error(t('tt.notifSetup.previewHint'));
      return;
    }

    if (Notification.permission === 'denied') {
      toast.error(t('tt.notifSetup.denied'));
      return;
    }

    let perm: NotificationPermission = Notification.permission;
    if (perm !== 'granted') {
      try {
        perm = await Notification.requestPermission();
      } catch {
        toast.error(t('tt.notifSetup.unsupported'));
        return;
      }
    }

    if (perm === 'granted') {
      setPrefs(topicId, { enabled: true });
      window.dispatchEvent(
        new CustomEvent('tt:subscription-changed', {
          detail: { topicId, enabled: true },
        }),
      );
      onEnabled();
      onClose();
      toast.success(t('tt.notifSetup.enabled'));
    } else if (perm === 'denied') {
      toast.error(t('tt.notifSetup.denied'));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-[480px] mx-auto rounded-t-3xl bg-background border border-border/40 shadow-2xl"
          >
            <div className="px-5 pt-5 pb-6">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t('tt.notifSetup.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('tt.notifSetup.description')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Iframe / unsupported hint */}
              {notificationUnavailable && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-muted/60 text-sm text-muted-foreground">
                  {t('tt.notifSetup.previewHint')}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleEnable}
                disabled={notificationUnavailable}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('tt.notifSetup.enableButton')}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('tt.notifSetup.notNow')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
