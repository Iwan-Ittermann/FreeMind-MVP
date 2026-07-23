import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Send, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/hooks/useClientIP';
import { toast } from 'sonner';
import { ensureSilentAuth } from '@/lib/silent-auth';
import { enableTopicNotifications, requestBrowserNotificationPermission } from '@/lib/tt-browser-notifications';
import { requireVerified } from '@/lib/verification';

type CTAState = 'collapsed' | 'half' | 'full';

interface TTCenterCTAProps {
  topicId: string;
  topicTitle: string;
  highlight?: boolean;
  onOpinionSubmitted?: () => void;
  onOpinionCommitted?: () => void;
}

/**
 * Centered pill-shaped CTA with three states:
 *   collapsed (+ icon only) → half (single-line pill) → full (textarea + post)
 * Click outside collapses; minimize icon collapses from full.
 * Default state is `half`.
 */
export function TTCenterCTA({
  topicId,
  topicTitle,
  highlight = false,
  onOpinionSubmitted,
  onOpinionCommitted,
}: TTCenterCTAProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [state, setState] = useState<CTAState>('half');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Outside click: only collapse when the composer is fully open.
  // The labeled `half` pill stays visible so users always see the CTA.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      // Don't collapse on portals (dialogs, toasts)
      if ((e.target as HTMLElement)?.closest?.('[role="dialog"]')) return;
      if (state === 'full') setState('half');
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [state]);

  // Auto-focus when entering full state
  useEffect(() => {
    if (state === 'full') {
      const id = window.setTimeout(() => taRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [state]);

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      toast.error(t('tt.opinionTooShort'));
      return;
    }
    if (!(await requireVerified())) {
      setState('collapsed');
      return;
    }
    setSubmitting(true);
    try {
      if (!user) await ensureSilentAuth();
      const ip = await getClientIP();
      const { data: opId, error } = await supabase.rpc('submit_opinion', {
        _topic_id: topicId,
        _text: text.trim(),
        _ip_address: ip,
      });
      if (error) throw error;

      // Mark this opinion as freshly added so SignalNode animates its entrance
      try {
        const newId = typeof opId === 'string' ? opId : null;
        if (newId) {
          sessionStorage.setItem('tt:fresh-opinion', JSON.stringify({ id: newId, ts: Date.now() }));
        }
      } catch { /* ignore */ }

      const prevCount = parseInt(localStorage.getItem('tt:opinion-submit-count') || '0', 10) || 0;
      const newCount = prevCount + 1;
      localStorage.setItem('tt:opinion-submit-count', String(newCount));
      const shouldPrompt =
        (newCount === 1 || newCount === 4 || newCount === 10) &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'default';
      if (shouldPrompt) {
        const permission = await requestBrowserNotificationPermission();
        if (permission === 'granted') {
          enableTopicNotifications(topicId);
        } else if (permission === 'denied') {
          toast.error(t('tt.notifSetup.denied'));
        }
      } else if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        enableTopicNotifications(topicId);
      }

      setText('');
      setState('collapsed');
      toast.success(t('tt.opinionPosted'));
      onOpinionCommitted?.();
      onOpinionSubmitted?.();
    } catch (e: any) {
      toast.error(e.message ?? t('tt.opinionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClick = () => {
    if (state === 'collapsed') setState('half');
    else if (state === 'half') setState('full');
  };

  const ringHighlight = highlight
    ? 'ring-4 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.65)] animate-pulse'
    : '';

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2 bottom-[140px] -translate-x-1/2 z-30 pointer-events-none"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'collapsed' && (
          <motion.button
            key="collapsed"
            type="button"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={handleClick}
            aria-label={t('tt.post')}
            className={`pointer-events-auto h-12 w-12 rounded-full bg-background/95 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-center text-foreground hover:bg-background transition-colors ${ringHighlight}`}
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}

        {state === 'half' && (
          <motion.button
            key="half"
            type="button"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={handleClick}
            className={`pointer-events-auto flex items-center gap-2 h-12 px-4 rounded-full bg-background/95 backdrop-blur-md border border-border/40 shadow-lg text-foreground hover:bg-background transition-colors max-w-[80vw] ${ringHighlight}`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="text-sm whitespace-nowrap truncate">
              {t('tt.opinionPlaceholder')}
            </span>
          </motion.button>
        )}

        {state === 'full' && (
          <motion.div
            key="full"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`pointer-events-auto relative w-[80vw] max-w-[360px] rounded-3xl bg-background/95 backdrop-blur-md border border-border/40 shadow-2xl overflow-hidden ${ringHighlight}`}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setState('collapsed'); }}
              aria-label={t('common.close')}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            >
              <Minus className="w-4 h-4" />
            </button>
            <Textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={topicTitle}
              maxLength={500}
              className="h-40 w-full resize-none border-0 bg-transparent focus-visible:ring-0 text-sm px-4 pt-10 pb-12 leading-relaxed"
            />
            <div className="absolute bottom-2 right-2">
              <Button
                size="sm"
                className="rounded-full uppercase tracking-wider text-xs h-9 shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={submitting || text.trim().length < 10}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {t('tt.post')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
