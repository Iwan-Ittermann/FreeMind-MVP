import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Quote, Mic, Square, Ban, Unlock, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnderstandingIcon } from '@/components/icons/UnderstandingIcon';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatMessages } from '@/hooks/useChatMessages';

import { BOT_USER_ID } from '@/lib/constants';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { currentRatingRound, nextRatingThreshold } from '@/lib/rating-rounds';


interface EmbeddedChatViewProps {
  theirOpinionId: string;
  /** Read-only observation of a conversation between two other people. */
  readOnly?: boolean;
  /** Required in read-only mode: the "A" side of the observed chat. */
  sourceOpinionId?: string;
}

export function EmbeddedChatView({ theirOpinionId, readOnly = false, sourceOpinionId }: EmbeddedChatViewProps) {
  const { t } = useTranslation();
  const {
    chatId, myOpinion, theirOpinion, theirUserId,
    saveRating, isSavingRating, existingRating, myRatingRounds,
    isBotChat,
  } = useChatSession(theirOpinionId, readOnly ? sourceOpinionId : undefined);

  const topicId = theirOpinion?.topic_id ?? null;
  const { messages: dbMessages, sendMessage, sendVoiceMessage, isSending, isBotTyping } = useChatMessages(
    chatId,
    isBotChat,
    topicId && myOpinion && theirOpinion
      ? { topicId, myOpinionId: myOpinion.id, theirOpinionId: theirOpinion.id }
      : undefined,
    readOnly && sourceOpinionId
      ? { sourceOpinionId, targetOpinionId: theirOpinionId, sourceUserId: myOpinion?.user_id }
      : undefined,
  );
  const { partnerTyping, setTyping } = useTypingIndicator(chatId);
  const { isBlocked, isBlockedByOther, blockUser, unblockUser, isBlocking, isUnblocking } = useUserBlocks(chatId, theirUserId);
  
  const { isRecording, duration, startRecording, stopRecording } = useVoiceRecorder();

  const [inputValue, setInputValue] = useState('');
  const [empathy, setEmpathy] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; isOwn: boolean } | null>(null);
  const [showUnlockSpark, setShowUnlockSpark] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (value.trim()) {
      setTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
    } else {
      setTyping(false);
    }
  }, [setTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    const content = inputValue;
    const replyId = replyingTo?.id ?? null;
    setInputValue('');
    setReplyingTo(null);
    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      await sendMessage(content, replyId);
    } catch {
      setInputValue(content);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob && blob.size > 0) {
        try {
          await sendVoiceMessage(blob);
        } catch (err) {
          console.error('Failed to send voice message:', err);
          toast.error('Failed to send voice message');
        }
      }
    } else {
      try {
        await startRecording();
      } catch {
        toast.error('Microphone access denied');
      }
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleSaveRating = async (value: number) => {
    if (currentRound == null) return;
    setEmpathy(value);
    try {
      await saveRating(value, existingRating?.disagreement ?? 5, currentRound);
    } catch {
      toast.error(t('chat.failedToSaveRating'));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbMessages]);

  const handleReply = useCallback((msg: { id: string; content: string; isOwn: boolean }) => {
    setReplyingTo(msg);
  }, []);

  // Build a map of message ID -> content for reply previews
  const messageContentMap = new Map<string, string>();
  dbMessages.forEach(msg => messageContentMap.set(msg.id, msg.content));

  // Rating rounds: both sides' messages count; a round can be rated once.
  const totalMessages = dbMessages.length;
  const currentRound = currentRatingRound(totalMessages);
  const nextThreshold = nextRatingThreshold(totalMessages);
  const alreadyRatedRound =
    currentRound != null && myRatingRounds.some((r) => r.messageCount === currentRound);
  const canRateRespect = !isBotChat && !readOnly && currentRound != null && !alreadyRatedRound;

  useEffect(() => {
    if (!chatId || !canRateRespect || currentRound == null) return;
    const key = `tt:respect-unlocked:${chatId}:${currentRound}`;
    if (sessionStorage.getItem(key) === 'true') return;
    sessionStorage.setItem(key, 'true');
    setShowUnlockSpark(true);
    const timer = setTimeout(() => setShowUnlockSpark(false), 1400);
    return () => clearTimeout(timer);
  }, [chatId, canRateRespect, currentRound]);

  // Reset the selection whenever a new round opens.
  useEffect(() => {
    setEmpathy(0);
  }, [currentRound]);


  const isLoading = !myOpinion || !theirOpinion;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('common.loadingChat')}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Opinion headers */}
            {theirOpinion && (
              <div className="px-2 py-2 rounded-lg bg-muted/50 border border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Quote className="w-3 h-3 text-secondary/60" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-secondary/60">
                      {t('chat.theirOpinion', 'Their opinion')}
                    </span>
                  </div>
                  {theirUserId && !isBotChat && !readOnly && (
                    <button
                      onClick={() => {
                        if (isBlocked) {
                          unblockUser().then(() => toast.success(t('floatingChat.userUnblocked')));
                        } else {
                          blockUser().then(() => toast.success(t('floatingChat.userBlocked')));
                        }
                      }}
                      disabled={isBlocking || isUnblocking}
                      className={`p-1 rounded-full transition-colors ${
                        isBlocked
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title={isBlocked ? t('floatingChat.unblockUser', 'Unblock') : t('floatingChat.blockUser', 'Block')}
                    >
                      {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {theirOpinion.visible ? theirOpinion.text : (theirOpinion.notice_text || 'Hidden')}
                </p>
              </div>
            )}
            <div className="border-t border-border/30 my-1" />
            {myOpinion && (
              <div className="px-2 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Quote className="w-3 h-3 text-primary/60" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-primary/60">
                    {t('chat.yourOpinion', 'Your opinion')}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {myOpinion.visible ? myOpinion.text : (myOpinion.notice_text || 'Hidden')}
                </p>
              </div>
            )}
            <div className="border-t border-border/30 my-1" />

            {/* Chat messages */}
            {dbMessages.map(msg => {
              const replyContent = msg.replyToId ? messageContentMap.get(msg.replyToId) : undefined;
              return (
                <ChatBubble
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  isOwn={msg.isOwn}
                  timestamp={msg.createdAt}
                  isOpinion={false}
                  visible={true}
                  noticeText={null}
                  isBotMessage={isBotChat && !msg.isOwn}
                  replyToContent={replyContent}
                  onReply={() => handleReply({ id: msg.id, content: msg.content, isOwn: msg.isOwn })}
                  audioUrl={msg.audioUrl}
                  transcript={msg.transcript}
                />
              );
            })}
            <AnimatePresence>
              {(partnerTyping.isTyping || isBotTyping) && <TypingIndicator userName={isBotTyping ? 'AI Bot' : partnerTyping.userName} />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-2 pt-1 pb-0 bg-muted/50 border-t border-border/40 flex items-center gap-2">
          <div className="flex-1 text-xs text-muted-foreground truncate px-2 py-1 rounded bg-background border border-border/30">
            ↩ {replyingTo.content}
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Understanding rating — always visible, unlocked after 2 own messages */}
      {!isBotChat && (
        <div className="border-t border-border/60 px-2 pt-2 pb-3 mb-1 shrink-0 bg-muted/60">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <UnderstandingIcon className="h-3.5 w-3.5" />
              {t('tt.understandingQuestion')}
            </span>
            <span className="relative text-[11px] text-muted-foreground">
              {!canRateRespect && t('tt.respectUnlockHint')}
              <AnimatePresence>
                {showUnlockSpark && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1.6, rotate: 10 }}
                    exit={{ opacity: 0, scale: 2 }}
                    className="pointer-events-none absolute -right-3 -top-2 text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {([
              { value: 0, key: 'tt.understandingStep.notAtAll' },
              { value: 2, key: 'tt.understandingStep.little' },
              { value: 5, key: 'tt.understandingStep.partly' },
              { value: 8, key: 'tt.understandingStep.good' },
              { value: 10, key: 'tt.understandingStep.veryGood' },
            ] as const).map(({ value: step, key }) => {
              const isActive = canRateRespect && empathy === step;
              const label = t(key);
              return (
                <button
                  key={step}
                  type="button"
                  disabled={!canRateRespect || isSavingRating}
                  onClick={() => handleSaveRating(step)}
                  className={`min-w-0 rounded-lg border px-0.5 py-1.5 text-[9px] font-semibold leading-tight transition-all ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground'
                  } ${!canRateRespect ? 'cursor-not-allowed opacity-40' : 'hover:opacity-80'}`}
                  aria-label={label}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* Input footer */}
      <div className="border-t border-border p-2 shrink-0 bg-muted/80">
        {isBlocked || isBlockedByOther ? (
          <p className="text-xs text-muted-foreground text-center py-1">
            {isBlocked ? t('floatingChat.blockedByYou') : t('floatingChat.blockedByThem')}
          </p>
        ) : isRecording ? (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 bg-background border border-red-500/50 h-8 rounded px-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[10px] font-mono">{formatDuration(duration)}</span>
            </div>
            <Button
              onClick={handleVoiceToggle}
              size="icon"
              className="h-8 w-8 shrink-0 bg-red-500 hover:bg-red-600"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Input
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('floatingChat.typeMessage')}
                className="h-8 text-xs bg-background text-foreground border-border"
                disabled={isSending}
              />
            </div>
            {inputValue.trim() ? (
              <Button
                onClick={handleSend}
                disabled={isSending}
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleVoiceToggle}
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <Mic className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
