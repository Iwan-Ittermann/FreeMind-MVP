import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Plus, X, BellRing } from 'lucide-react';

const DISMISS_KEY = 'tt:install-hint-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Mobile nudge to add freemind to the home screen so notification badges work
 * even when the browser tab is closed.
 */
export function TTInstallHint() {
  const [visible, setVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const timer = window.setTimeout(() => setVisible(true), 12000);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="pointer-events-auto absolute bottom-20 left-3 right-3 z-50 rounded-2xl border border-border/40 bg-background/95 p-3 shadow-2xl backdrop-blur-xl"
        >
          <button
            onClick={dismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Hinweis schließen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-3 pr-6">
            <div className="mt-0.5 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Auf den Startbildschirm legen</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                So siehst du neue Antworten als Zähler am App-Symbol – auch ohne offenen Browser-Tab.
              </p>
              {promptEvent ? (
                <button
                  onClick={install}
                  className="mt-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Jetzt hinzufügen
                </button>
              ) : isIos() ? (
                <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-foreground/80">
                  Tippe auf <Share className="inline h-3.5 w-3.5" /> „Teilen“ und dann auf
                  <Plus className="inline h-3.5 w-3.5" /> „Zum Home-Bildschirm“.
                </p>
              ) : (
                <p className="mt-2 text-xs text-foreground/80">
                  Menü öffnen (⋮) und „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
