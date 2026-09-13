import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, Lock, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { loginWithPassphrase } from '@/lib/passphrase-login';

export const DEMO_MODE_KEY = 'freemind_wedium_demo';
const OPEN_EVENT = 'tt:open-demo';

export function openDemoAccess() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function hasDemoAccess(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

interface DemoAccount {
  key: string;
  name: string;
  opinion: string;
}

/**
 * Password-gated test access for partners: unlocks a list of four prepared
 * demo accounts and signs in as the chosen one.
 */
export function TTDemoAccessPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState('');
  const [accounts, setAccounts] = useState<DemoAccount[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const close = () => {
    setOpen(false);
    setError(null);
    setBusy(false);
  };

  if (!open) return null;

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error: fnErr } = await supabase.functions.invoke('wedium-demo-access', {
      body: { password },
    });
    setBusy(false);
    const list = (data as { accounts?: DemoAccount[] } | null)?.accounts;
    if (fnErr || !list) {
      setError(t('tt.demo.wrongPassword'));
      return;
    }
    setAccounts(list);
    setUnlocked(password);
    setPassword('');
  };

  const pickAccount = async (account: DemoAccount) => {
    setError(null);
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('wedium-demo-access', {
        body: { password: unlocked, accountKey: account.key },
      });
      const phrase = (data as { passphrase?: string } | null)?.passphrase;
      if (fnErr || !phrase) {
        setError(t('tt.demo.failed'));
        return;
      }
      const res = await loginWithPassphrase(phrase);
      if (!res.ok) {
        setError(t('tt.demo.failed'));
        return;
      }
      try {
        localStorage.setItem(DEMO_MODE_KEY, '1');
      } catch {
        /* ignore */
      }
      await queryClient.invalidateQueries();
      toast.success(t('tt.demo.loggedInAs', { name: account.name }));
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[45] flex items-center justify-center px-5 bg-background/85 backdrop-blur-[3px]">
      <div className="relative w-full max-w-[360px] rounded-2xl bg-background/95 border border-border/50 shadow-2xl p-5">
        <button
          type="button"
          onClick={close}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
          aria-label={t('common.close', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>

        {!accounts ? (
          <>
            <Lock className="w-6 h-6 mx-auto mb-3 text-primary" />
            <h2 className="text-base font-semibold text-foreground mb-1 text-center">
              {t('tt.demo.title')}
            </h2>
            <p className="text-sm text-muted-foreground mb-3 text-center">{t('tt.demo.body')}</p>
            <form onSubmit={submitPassword} className="space-y-2">
              <Input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('tt.demo.passwordPlaceholder')}
                className="text-sm text-center"
              />
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('tt.demo.unlock')}
              </Button>
            </form>
          </>
        ) : (
          <>
            <KeyRound className="w-6 h-6 mx-auto mb-3 text-primary" />
            <h2 className="text-base font-semibold text-foreground mb-1 text-center">
              {t('tt.demo.chooseTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mb-3 text-center">
              {t('tt.demo.chooseBody')}
            </p>
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {accounts.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  disabled={busy}
                  onClick={() => pickAccount(a)}
                  className="w-full text-left rounded-xl border border-border/60 bg-card px-3 py-2.5 hover:border-primary transition-colors disabled:opacity-60"
                >
                  <span className="block text-sm font-semibold text-foreground">{a.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{a.opinion}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="mt-3 text-xs text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}
