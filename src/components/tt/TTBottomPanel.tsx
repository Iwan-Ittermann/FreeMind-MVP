import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TTEmojiRating } from './TTEmojiRating';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/hooks/useClientIP';
import { toast } from 'sonner';
import { useDisagreementRating } from '@/hooks/useOpinionRating';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { ensureSilentAuth } from '@/lib/silent-auth';
import { enableTopicNotifications, requestBrowserNotificationPermission } from '@/lib/tt-browser-notifications';

interface SelectedOpinion {
  id: string;
  text: string;
}

interface TTBottomPanelProps {
  topicId: string;
  hasOwnOpinion: boolean;
  ownOpinionKnown: boolean;
  ownOpinionId: string | null;
  selected: SelectedOpinion | null;
  highlightAddOpinionForm?: boolean;
  onLetsChat?: (targetOpinionId: string) => void;
  onOpinionSubmitted?: () => void;
  onOpinionCommitted?: () => void;
  onCloseSelection?: () => void;
}

/** Pick a font-size class based on opinion length so short text fills the space. */
function getOpinionFontClass(len: number): string {
  if (len < 60) return 'text-xl leading-snug';
  if (len < 150) return 'text-base leading-snug';
  if (len < 280) return 'text-sm leading-relaxed';
  return 'text-xs leading-relaxed';
}

export function TTBottomPanel({
  topicId,
  hasOwnOpinion,
  ownOpinionKnown,
  ownOpinionId,
  selected,
  highlightAddOpinionForm = false,
  onLetsChat,
  onOpinionSubmitted,
  onOpinionCommitted,
  onCloseSelection,
}: TTBottomPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Click outside the selected-opinion panel closes the selection
  useEffect(() => {
    if (!selected) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) return;
      // Don't close on graph node taps — those re-open with a new selection.
      // We also avoid closing on dialogs (report dialog renders to portal).
      const inPortal = (target as HTMLElement)?.closest?.('[role="dialog"]');
      if (inPortal) return;
      // Don't close on graph svg / nodes — let the graph component reassign.
      const inGraph = (target as HTMLElement)?.closest?.('[data-tt-graph]');
      if (inGraph) return;
      onCloseSelection?.();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [selected, onCloseSelection]);

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      toast.error(t('tt.opinionTooShort'));
      return;
    }
    const permissionPromise = requestBrowserNotificationPermission();
    setSubmitting(true);
    try {
      // Silent signup if needed — keeps `auth.users` empty for pure browsers
      if (!user) await ensureSilentAuth();
      const ip = await getClientIP();
      const { error } = await supabase.rpc('submit_opinion', {
        _topic_id: topicId,
        _text: text.trim(),
        _ip_address: ip,
      });
      if (error) throw error;
      const permission = await permissionPromise;
      if (permission === 'granted') {
        enableTopicNotifications(topicId);
      }
      setText('');
      setFocused(false);
      toast.success(t('tt.opinionPosted'));
      onOpinionCommitted?.();
      if (permission === 'denied') {
        toast.error(t('tt.notifSetup.denied'));
      }
      onOpinionSubmitted?.();
    } catch (e: any) {
      toast.error(e.message ?? t('tt.opinionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // STATE 1: Selected opinion view
  if (selected && hasOwnOpinion) {
    const fontClass = getOpinionFontClass(selected.text.length);
    return (
      <>
        <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3">
          <div
            ref={panelRef}
            className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg p-4 relative"
          >
            {/* Report button (top-right) */}
            <button
              onClick={() => setReportOpen(true)}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label={t('tt.report')}
              title={t('tt.report')}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>

            {/* Centered, responsive opinion text */}
            <div className="min-h-[64px] flex items-center justify-center px-4 py-2">
              <p className={`text-center text-foreground ${fontClass}`}>
                {selected.text}
              </p>
            </div>

            {/* Emoji rating + Let's chat (inline row) */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                {canRate ? (
                  <>
                    <TTEmojiRating value={disagreement} onChange={setDisagreement} />
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground tracking-wide px-0.5">
                      <span>{t('tt.fullyAgree')}</span>
                      <span>{t('tt.fullyDisagree')}</span>
                    </div>
                  </>
                ) : !hasOwnOpinion ? (
                  <p className="text-[10px] text-muted-foreground">
                    {t('tt.postFirstToRate')}
                  </p>
                ) : (
                  <span />
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0 h-8 text-xs"
                onClick={() => {
                  if (!user) {
                    ensureSilentAuth().catch(() => {});
                  }
                  onLetsChat?.(selected.id);
                }}
                disabled={!hasOwnOpinion}
              >
                {t('tt.letsChat')}
              </Button>
            </div>
          </div>
        </div>

        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          contentId={selected.id}
          contentType="Opinion"
          contentPreview={selected.text}
        />
      </>
    );
  }

  // STATE 2: No opinion yet (or browsing) → expanding input with floating button
  if (!hasOwnOpinion) {
    return (
      <div ref={wrapperRef} className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3">
        <div className="relative">
          {/* Floating Posten button — appears when focused */}
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
            className={`rounded-2xl bg-background/95 backdrop-blur-md border shadow-lg overflow-hidden transition-shadow ${highlightAddOpinionForm ? 'border-primary/80 ring-4 ring-primary/30 shadow-primary/30 animate-pulse' : 'border-border/40'}`}
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

  // STATE 3: Has own opinion, nothing selected → empty placeholder
  return (
    <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3 pointer-events-none">
      <div className="rounded-2xl bg-background/70 backdrop-blur-sm border border-border/30 shadow p-3 text-center">
        <p className="text-xs text-muted-foreground">{t('tt.tapNodeHint')}</p>
      </div>
    </div>
  );
}
