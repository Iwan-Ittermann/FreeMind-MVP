import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Send, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/hooks/useClientIP';

export type GateVariant = 'countdown' | 'submit' | 'waiting';

interface TTGateOverlayProps {
  variant: GateVariant;
  topicId: string;
  topicTitle: string;
  /** Target date the countdown runs towards. */
  target?: Date | null;
  isVerified?: boolean;
  onSubmitted?: () => void;
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
 * The header (settings / login) and footer stay reachable.
 */
export function TTGateOverlay({
  variant,
  topicId,
  topicTitle,
  target,
  isVerified = false,
  onSubmitted,
}: TTGateOverlayProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const countdown = useCountdown(target);

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
              <p className="mt-4 text-xs text-muted-foreground">
                {t('tt.registerToParticipate')}{' '}
                <a href="https://freemind.chat" className="text-primary hover:underline font-medium">
                  freemind.chat
                </a>{' '}
                {t('tt.registerToParticipateSuffix')}
              </p>
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
