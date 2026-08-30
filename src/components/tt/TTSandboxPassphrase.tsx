import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const SHOWN_KEY = 'freemind_sandbox_phrase_shown';

/**
 * Shows the silently generated passphrase exactly once, so a sandbox visitor
 * can come back on another device.
 */
export function TTSandboxPassphrase({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [phrase, setPhrase] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      try {
        if (localStorage.getItem(SHOWN_KEY)) return;
        const p = localStorage.getItem('freemind_silent_phrase');
        if (p) setPhrase(p);
      } catch {
        /* ignore */
      }
    };
    check();
    const id = window.setInterval(check, 2000);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled || !phrase) return null;

  const close = () => {
    try {
      localStorage.setItem(SHOWN_KEY, '1');
    } catch {
      /* ignore */
    }
    setPhrase(null);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('sandbox.phraseTitle', 'Your passphrase')}</DialogTitle>
          <DialogDescription>
            {t(
              'sandbox.phraseBody',
              'Keep this passphrase to return to your sandbox account — also on another device.',
            )}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-center font-mono text-sm select-all">
          {phrase}
        </p>
        <Button className="rounded-full" onClick={close}>
          {t('common.ok', 'OK')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
