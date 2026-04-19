import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TTEmojiRating } from './TTEmojiRating';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/hooks/useClientIP';
import { toast } from 'sonner';
import { useDisagreementRating } from '@/hooks/useOpinionRating';

interface SelectedOpinion {
  id: string;
  text: string;
}

interface TTBottomPanelProps {
  topicId: string;
  hasOwnOpinion: boolean;
  ownOpinionId: string | null;
  selected: SelectedOpinion | null;
  onLetsChat?: (targetOpinionId: string) => void;
  onReport?: (opinionId: string) => void;
  onOpinionSubmitted?: () => void;
}

export function TTBottomPanel({
  topicId,
  hasOwnOpinion,
  ownOpinionId,
  selected,
  onLetsChat,
  onReport,
  onOpinionSubmitted,
}: TTBottomPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { disagreement, setDisagreement, canRate } = useDisagreementRating(
    topicId,
    ownOpinionId,
    selected?.id ?? null,
  );

  // Click outside collapses the textarea (if empty)
  useEffect(() => {
    if (!focused) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        if (text.trim() === '') setFocused(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [focused, text]);

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
      setFocused(false);
      toast.success(t('tt.opinionPosted'));
      onOpinionSubmitted?.();
    } catch (e: any) {
      toast.error(e.message ?? t('tt.opinionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // STATE 1: Selected opinion view
  if (selected) {
    return (
      <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3">
        <div className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg p-4 relative">
          <button
            onClick={() => onReport?.(selected.id)}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            aria-label={t('tt.report')}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm leading-relaxed pr-6 mb-3">{selected.text}</p>

          {canRate ? (
            <TTEmojiRating value={disagreement} onChange={setDisagreement} />
          ) : !user ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              {t('tt.signInToRate')}
            </p>
          ) : !hasOwnOpinion ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              {t('tt.postFirstToRate')}
            </p>
          ) : null}

          <div className="flex justify-end mt-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onLetsChat?.(selected.id)}
              disabled={!user || !hasOwnOpinion}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              {t('tt.letsChat')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: Logged in but no opinion → expanding input with floating button
  if (user && !hasOwnOpinion) {
    return (
      <div ref={wrapperRef} className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3">
        <div className="relative">
          {/* Floating Posten button */}
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute right-2 -top-2 -translate-y-full z-10"
              >
                <Button
                  size="sm"
                  className="rounded-full uppercase tracking-wider text-xs h-9 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmit}
                  disabled={submitting || text.trim().length < 10}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {t('tt.post')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{ height: focused ? 152 : 56 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg overflow-hidden"
          >
            <Textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder={t('tt.opinionPlaceholder')}
              className="h-full w-full resize-none border-0 bg-transparent focus-visible:ring-0 text-sm px-4 py-4 leading-relaxed"
              maxLength={500}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  // STATE 3: Not signed in → inline auth
  if (!user) {
    return (
      <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3">
        <div className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg p-3">
          <AuthForm compact />
        </div>
      </div>
    );
  }

  // STATE 4: Has own opinion, nothing selected → empty placeholder
  return (
    <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3 pointer-events-none">
      <div className="rounded-2xl bg-background/70 backdrop-blur-sm border border-border/30 shadow p-3 text-center">
        <p className="text-xs text-muted-foreground">{t('tt.tapNodeHint')}</p>
      </div>
    </div>
  );
}
