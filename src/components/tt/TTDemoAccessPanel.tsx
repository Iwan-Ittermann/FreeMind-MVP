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
const CHANGED_EVENT = 'tt:demo-changed';

export function openDemoAccess() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

function readFlag(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function hasDemoAccess(): boolean {
  return readFlag();
}

/** Called on logout so the lock screen comes back. */
export function clearDemoAccess() {
  try {
    localStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

function setDemoAccess() {
  try {
    localStorage.setItem(DEMO_MODE_KEY, '1');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

/**
 * Demo access is only active while a session exists — signing out sends the
 * visitor back to the lock screen.
 */
export function useDemoAccess(): boolean {
  const [active, setActive] = useState(readFlag());

  useEffect(() => {
    const sync = async () => {
      if (!readFlag()) {
        setActive(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        clearDemoAccess();
        setActive(false);
        return;
      }
      setActive(true);
    };
    sync();
    const onChanged = () => { sync(); };
    window.addEventListener(CHANGED_EVENT, onChanged);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearDemoAccess();
        setActive(false);
        return;
      }
      sync();
    });
    return () => {
      window.removeEventListener(CHANGED_EVENT, onChanged);
      sub.subscription.unsubscribe();
    };
  }, []);

  return active;
}

interface DemoAccount {
  key: string;
  name: string;
  opinion: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Password-gated test access for partners: unlocks a list of prepared
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
        setError(t('tt.demo.setupFailed'));
        return;
      }

      // A freshly created account may not be signable-in on the very first
      // attempt — retry a couple of times before giving up.
      let reason: string | undefined;
      let signedIn = false;
      for (let attempt = 0; attempt < 3 && !signedIn; attempt++) {
        if (attempt > 0) await wait(attempt === 1 ? 250 : 750);
        const res = await loginWithPassphrase(phrase, 'wedium');
        reason = res.reason;
        if (!res.ok) continue;
        const { data: userData } = await supabase.auth.getUser();
        signedIn = !!userData.user;
      }
      if (!signedIn) {
        setError(
          reason === 'invalid-format'
            ? t('tt.demo.failed')
            : t('tt.demo.loginFailed'),
        );
        return;
      }

      setDemoAccess();
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
            {busy && (
              <div className="mt-3 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}

        {error && <p className="mt-3 text-xs text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}
