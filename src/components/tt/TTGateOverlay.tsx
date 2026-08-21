import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Send, Lock, KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/hooks/useClientIP';
import { loginWithPassphrase } from '@/lib/passphrase-login';

export type GateVariant = 'countdown' | 'submit' | 'waiting' | 'login';

interface TTGateOverlayProps {
  variant: GateVariant;
  topicId: string;
  topicTitle: string;
  /** Target date the countdown runs towards. */
  target?: Date | null;
  isVerified?: boolean;
  onSubmitted?: () => void;
  /** Called after a successful passphrase login. */
  onLoggedIn?: () => void;
}


function useCountdown(target?: Date | null) {
  return useMemo(() => {
    if (!target) return null;
    const ms = target.getTime() - Date.now();
    if (ms <= 0) return null;
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    return { days, hours, minutes };
  }, [target]);
}

/**
 * Blocking overlay for the real event question:
 *  - `countdown` before the submission window opens
 *  - `submit`    mandatory opinion before the graph unlocks
 *  - `waiting`   opinion submitted, discussion not started yet
 *  - `login`     passphrase login required before anything else
 * The header (settings / login) and footer stay reachable.
 */
export function TTGateOverlay({
  variant,
  topicId,
  topicTitle,
  target,
  isVerified = false,
  onSubmitted,
  onLoggedIn,
}: TTGateOverlayProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const countdown = useCountdown(target);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    const res = await loginWithPassphrase(passphrase);
    setLoggingIn(false);
    if (res.ok) {
      setPassphrase('');
      toast.success(t('tt.event.loginSuccess'));
      onLoggedIn?.();
      return;
    }
    setLoginError(
      res.reason === 'invalid-format'
        ? t('tt.event.loginInvalidFormat')
        : res.reason === 'not-found'
          ? t('tt.event.loginNotFound')
          : t('tt.event.loginError'),
    );
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      toast.error(t('tt.opinionTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      const ip = await getClientIP();
      const { error } = await supabase.rpc('submit_opinion', {
        _topic_id: topicId,
        _text: text.trim(),
        _ip_address: ip,
      });
      if (error) throw error;
      setText('');
      toast.success(t('tt.opinionPosted'));
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e?.message ?? t('tt.opinionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const countdownLine = countdown
    ? t('tt.event.countdownValue', {
        days: countdown.days,
        hours: countdown.hours,
        minutes: countdown.minutes,
        defaultValue: '{{days}} d {{hours}} h {{minutes}} min',
      })
    : null;

  return (
    <div className="absolute inset-0 z-[38] flex items-center justify-center px-5 pb-16 pt-14 bg-background/80 backdrop-blur-[3px]">
      <div className="w-full max-w-[360px] rounded-2xl bg-background/95 border border-border/50 shadow-2xl p-5 text-center">
        {variant === 'login' && (
          <>
            <KeyRound className="w-6 h-6 mx-auto mb-3 text-primary" />
            <h2 className="text-base font-semibold text-foreground mb-1">
              {t('tt.event.loginTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{t('tt.event.loginBody')}</p>
            <form onSubmit={handleLogin} className="space-y-2">
              <Input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                
                className="font-mono text-sm text-center"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button type="submit" className="w-full rounded-full" disabled={loggingIn}>
                {t('tt.event.loginButton')}
              </Button>
            </form>
            {loginError && (
              <p className="mt-2 text-xs text-destructive">{loginError}</p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              {t('tt.registerToParticipate')}{' '}
              <a href="https://freemind.chat" className="text-primary hover:underline font-medium">
                freemind.chat
              </a>{' '}
              {t('tt.registerToParticipateSuffix')}
            </p>
          </>
        )}


        {variant === 'countdown' && (
          <>
            <Clock className="w-6 h-6 mx-auto mb-3 text-primary" />
            <h2 className="text-base font-semibold text-foreground mb-1">
              {t('tt.event.countdownTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('tt.event.countdownBody')}</p>
            {countdownLine && (
              <p className="mt-3 text-lg font-semibold text-foreground tabular-nums">
                {countdownLine}
              </p>
            )}
            {!isVerified && (
              <>
                <p className="mt-4 text-xs text-muted-foreground">
                  {t('tt.registerToParticipate')}{' '}
                  <a href="https://freemind.chat" className="text-primary hover:underline font-medium">
                    freemind.chat
                  </a>{' '}
                  {t('tt.registerToParticipateSuffix')}
                </p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('tt:open-login'))}
                  className="mt-2 text-xs text-primary hover:underline font-medium"
                >
                  {t('tt.alreadyHavePassphrase')}
                </button>
              </>
            )}

          </>
        )}

        {variant === 'submit' && (
          <>
            <Lock className="w-6 h-6 mx-auto mb-3 text-primary" />
            <h2 className="text-base font-semibold text-foreground mb-1">
              {t('tt.event.submitTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{t('tt.event.submitBody')}</p>
            <p className="text-sm font-medium text-foreground mb-3">{topicTitle}</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('tt.opinionPlaceholder')}
              rows={4}
              className="resize-none text-sm"
            />
            <Button
              className="mt-3 w-full rounded-full"
              onClick={handleSubmit}
              disabled={submitting || text.trim().length < 10}
            >
              <Send className="w-4 h-4 mr-2" />
              {t('tt.post')}
            </Button>
          </>
        )}

        {variant === 'waiting' && (
          <>
            <Clock className="w-6 h-6 mx-auto mb-3 text-primary" />
            <h2 className="text-base font-semibold text-foreground mb-1">
              {t('tt.event.waitingTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('tt.event.waitingBody')}</p>
            {countdownLine && (
              <p className="mt-3 text-lg font-semibold text-foreground tabular-nums">
                {countdownLine}
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              {t('tt.event.tryTestTopic')}{' '}
              <a href="/test" className="text-primary hover:underline font-medium">
                /test
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
