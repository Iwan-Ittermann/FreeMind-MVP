import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageSquare, MessageCircle, Globe, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  NotificationFilters,
  getDefaultFilters,
  getPrefs,
  setPrefs,
} from '@/lib/tt-notification-prefs';

interface TTNotificationSetupProps {
  open: boolean;
  onClose: () => void;
  topicId: string;
  /** Called after permission granted and prefs saved */
  onEnabled: () => void;
}

const FILTER_ITEMS: {
  key: keyof NotificationFilters;
  iconEl: React.ReactNode;
  labelKey: string;
  descKey: string;
  disabled?: boolean;
}[] = [
  {
    key: 'newOpinion',
    iconEl: <Bell className="w-4 h-4" />,
    labelKey: 'tt.notifFilter.newOpinion',
    descKey: 'tt.notifFilter.newOpinionDesc',
  },
  {
    key: 'newMessage',
    iconEl: <MessageSquare className="w-4 h-4" />,
    labelKey: 'tt.notifFilter.newMessage',
    descKey: 'tt.notifFilter.newMessageDesc',
  },
  {
    key: 'newChat',
    iconEl: <MessageCircle className="w-4 h-4" />,
    labelKey: 'tt.notifFilter.newChat',
    descKey: 'tt.notifFilter.newChatDesc',
  },
  {
    key: 'newTopic',
    iconEl: <Globe className="w-4 h-4" />,
    labelKey: 'tt.notifFilter.newTopic',
    descKey: 'tt.notifFilter.newTopicDesc',
  },
  {
    key: 'newHighlight',
    iconEl: <Sparkles className="w-4 h-4" />,
    labelKey: 'tt.notifFilter.newHighlight',
    descKey: 'tt.notifFilter.newHighlightDesc',
    disabled: true,
  },
];

export function TTNotificationSetup({
  open,
  onClose,
  topicId,
  onEnabled,
}: TTNotificationSetupProps) {
  const { t } = useTranslation();
  const existing = getPrefs(topicId);
  const [filters, setFilters] = useState<NotificationFilters>(
    existing?.filters ?? getDefaultFilters(),
  );

  const toggle = (key: keyof NotificationFilters) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      toast.error(t('tt.notifSetup.unsupported'));
      return;
    }

    if (Notification.permission === 'denied') {
      toast.error(t('tt.notifSetup.denied'));
      return;
    }

    let perm: NotificationPermission = Notification.permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
      setPrefs(topicId, { enabled: true, filters });
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
            <div className="px-5 pt-5 pb-8">
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

              {/* Filter toggles */}
              <div className="space-y-1 mb-6">
                {FILTER_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => !item.disabled && toggle(item.key)}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                      item.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : filters[item.key]
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        filters[item.key] && !item.disabled
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.iconEl}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {t(item.labelKey)}
                        {item.disabled && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t('tt.notifFilter.comingSoon')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{t(item.descKey)}</div>
                    </div>
                    {!item.disabled && (
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          filters[item.key]
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border'
                        }`}
                      >
                        {filters[item.key] && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={handleEnable}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
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
