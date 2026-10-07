import { useReadOnlyTopic } from '@/contexts/ReadOnlyContext';
import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Flag, Pencil, Send } from 'lucide-react';
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
  highlightLetsChatButton?: boolean;
  highlightDisagreementScale?: boolean;
  forceShowAddOpinionForm?: boolean;
  suppressHintPanel?: boolean;
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
  highlightLetsChatButton = false,
  highlightDisagreementScale = false,
  forceShowAddOpinionForm = false,
  suppressHintPanel = false,
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

  const {
    disagreement,
    setDisagreementLocal,
    saveNow,
    hasSavedRating,
    isSaving,
    canRate: canRateRaw,
  } = useDisagreementRating(topicId, ownOpinionId, selected?.id ?? null);
  const [ratingTouched, setRatingTouched] = useState(false);
  const [ratingConfirmed, setRatingConfirmed] = useState(false);
  const [ratingReopened, setRatingReopened] = useState(false);
  const topicReadOnly = useReadOnlyTopic();
  const canRate = canRateRaw && !topicReadOnly;
  const chatDisabled = !hasOwnOpinion || topicReadOnly;

  // Reset the two-step flow whenever another opinion is selected.
  useEffect(() => {
    setRatingTouched(false);
    setRatingConfirmed(false);
    setRatingReopened(false);
  }, [selected?.id]);



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

  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      toast.error(t('tt.opinionTooShort'));
      return;
    }
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
      // The freshly created opinion must be picked up by chat/opinion queries.
      await queryClient.invalidateQueries({ queryKey: ['myOpinionForTopic'] });

      // Increment opinion-submission counter and prompt for browser
      // notification permission only on the 1st, 4th, and 10th opinion.
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
      setFocused(false);
      toast.success(t('tt.opinionPosted'));
      onOpinionCommitted?.();
      onOpinionSubmitted?.();
    } catch (e: any) {
      toast.error(e.message ?? t('tt.opinionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOpinionPanel = selected ? (() => {
    const fontClass = getOpinionFontClass(selected.text.length);
    const ratingDone = (ratingConfirmed || hasSavedRating) && !ratingReopened;
    return (
      <div className={`absolute bottom-[84px] inset-x-0 px-3 ${highlightDisagreementScale ? 'z-[60]' : 'z-30'}`}>
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

            {/* Step 1: rate the opinion difference, confirm with OK */}
            {!ratingDone && !topicReadOnly && (
              <div className="mt-3">
                <div className={`min-w-0 flex flex-col gap-1 rounded-xl transition-all duration-300 ${highlightDisagreementScale ? 'relative z-[60] bg-background border border-primary px-2 py-1.5 ring-4 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.65)] scale-[1.02]' : ''}`}>
                  <TTEmojiRating
                    value={disagreement}
                    onChange={(v) => {
                      setDisagreementLocal(v);
                      setRatingTouched(true);
                    }}
                    disabled={!canRate}
                    unset={!ratingTouched && !hasSavedRating}
                  />
                  <div className="text-center text-[10px] text-muted-foreground tracking-wide mt-0.5">
                    {t('tt.opinionDifferenceLabel')}
                  </div>
                  {!canRate && !hasOwnOpinion ? (
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      {t('tt.postFirstToRate')}
                    </p>
                  ) : (
                    <div className="mt-2 flex justify-center">
                      <Button
                        size="sm"
                        className="rounded-full h-8 text-xs px-6"
                        disabled={!canRate || !ratingTouched || isSaving}
                        onClick={async () => {
                          try {
                            await saveNow();
                            setRatingReopened(false);
                            setRatingConfirmed(true);

                          } catch {
                            toast.error(t('tt.ratingFailed'));
                          }
                        }}
                      >
                        {isSaving ? t('floatingChat.saving') : t('common.ok', 'OK')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: chat unlocked once the rating is stored */}
            {ratingDone && !topicReadOnly && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                {hasSavedRating && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{t('tt.yourRating', 'Deine Bewertung')}:</span>
                    <span className="tabular-nums text-foreground/80">{disagreement}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRatingReopened(true);
                        setRatingTouched(true);
                      }}
                      className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={t('tt.editRating', 'Bewertung ändern')}
                      title={t('tt.editRating', 'Bewertung ändern')}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full h-8 text-xs px-4 transition-all duration-300 ${highlightLetsChatButton ? 'relative z-[60] border-primary ring-4 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.65)] animate-pulse' : ''}`}
                  onClick={() => {
                    if (chatDisabled) return;
                    if (!user) {
                      ensureSilentAuth().catch(() => {});
                    }
                    onLetsChat?.(selected.id);
                  }}
                  disabled={chatDisabled}
                  title={chatDisabled ? t('chat.submitOpinionRequired') : t('tt.letsChat')}
                >
                  {t('tt.letsChat')}
                </Button>
                {!hasSavedRating && (
                  <button
                    onClick={() => {
                      setRatingReopened(true);
                      setRatingTouched(true);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('tt.editRating', 'Bewertung ändern')}
                  </button>
                )}
              </div>
            )}

          </div>
      </div>
    );
  })() : null;


  // Add-opinion form has moved into the centered TTCenterCTA — this panel only
  // hosts the selected-opinion read/rate UI now.
  return (
    <>
      {selectedOpinionPanel}
      {selected && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          contentId={selected.id}
          contentType="Opinion"
          contentPreview={selected.text}
        />
      )}
    </>
  );
}
