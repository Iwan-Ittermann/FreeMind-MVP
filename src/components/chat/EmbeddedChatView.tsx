import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Heart, HeartCrack, Check, X, Quote, Mic, Square, Ban, Unlock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatReactions } from '@/hooks/useChatReactions';
import { BOT_USER_ID } from '@/lib/constants';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface EmbeddedChatViewProps {
  theirOpinionId: string;
}

export function EmbeddedChatView({ theirOpinionId }: EmbeddedChatViewProps) {
  const { t } = useTranslation();
  const {
    chatId, myOpinion, theirOpinion, theirUserId,
    saveRating, isSavingRating, existingRating, averageBridgingScore,
    isBotChat,
  } = useChatSession(theirOpinionId);

  const topicId = theirOpinion?.topic_id ?? null;
  const { messages: dbMessages, sendMessage, sendVoiceMessage, isSending, isBotTyping } = useChatMessages(
    chatId,
    isBotChat,
    topicId && myOpinion && theirOpinion
      ? { topicId, myOpinionId: myOpinion.id, theirOpinionId: theirOpinion.id }
      : undefined,
  );
  const { partnerTyping, setTyping } = useTypingIndicator(chatId);
  const { isBlocked, isBlockedByOther, blockUser, unblockUser, isBlocking, isUnblocking } = useUserBlocks(chatId, theirUserId);
  const { getReactionsForMessage, hasReacted, addReaction, removeReaction } = useChatReactions(chatId);
  const { isRecording, duration, startRecording, stopRecording } = useVoiceRecorder();

  const [inputValue, setInputValue] = useState('');
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [empathy, setEmpathy] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; isOwn: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (existingRating && !initialized) {
      setEmpathy(existingRating.empathy);
      setInitialized(true);
    }
  }, [existingRating, initialized]);

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

  const handleSaveRating = async () => {
    try {
      await saveRating(empathy, existingRating?.disagreement ?? 50);
      setIsRatingOpen(false);
    } catch {
      toast.error(t('chat.failedToSaveRating'));
    }
  };

  useEffect(() => {
    if (!isRatingOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dbMessages, isRatingOpen]);

  const handleReply = useCallback((msg: { id: string; content: string; isOwn: boolean }) => {
    setReplyingTo(msg);
  }, []);

  const handleReaction = useCallback((messageId: string, reactionType: string) => {
    if (hasReacted(messageId, reactionType)) {
      removeReaction({ messageId, reactionType });
    } else {
      addReaction({ messageId, reactionType });
    }
  }, [hasReacted, addReaction, removeReaction]);

  // Build a map of message ID -> content for reply previews
  const messageContentMap = new Map<string, string>();
  dbMessages.forEach(msg => messageContentMap.set(msg.id, msg.content));

  const isLoading = !myOpinion || !theirOpinion;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('common.loadingChat')}
          </div>
        ) : isRatingOpen ? (
          <div className="p-3 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">{t('floatingChat.rateConversation')}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRatingOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('floatingChat.respect')}</span>
                <span className="text-xs font-mono text-rose-400">{empathy}</span>
              </div>
              <div className="relative">
                <Slider
                  value={[empathy + 50]}
                  onValueChange={(v) => setEmpathy(v[0] - 50)}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-rose-400 [&_[role=slider]]:border-rose-400 [&_.bg-primary]:bg-rose-400/30"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-foreground/20 pointer-events-none" />
              </div>
              <div className="flex justify-between">
                <HeartCrack className="w-4 h-4 text-rose-400" />
                <Heart className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <button
              onClick={handleSaveRating}
              disabled={isSavingRating}
              className="mx-auto flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
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
                  {theirUserId && !isBotChat && (
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
              const reactions = getReactionsForMessage(msg.id);
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
                  reactions={reactions}
                  onReply={() => handleReply({ id: msg.id, content: msg.content, isOwn: msg.isOwn })}
                  onReaction={(type) => handleReaction(msg.id, type)}
                  hasISeenYou={hasReacted(msg.id, 'i_see_you')}
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
            {!isBotChat && (
              <Button
                variant={isRatingOpen ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsRatingOpen(!isRatingOpen)}
                className={`shrink-0 text-xs h-8 px-2.5 border-foreground/30 text-foreground ${!existingRating && !isRatingOpen ? 'animate-pulse' : ''}`}
              >
                {t('floatingChat.rate')}
              </Button>
            )}
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('floatingChat.typeMessage')}
              className="h-8 text-xs bg-background text-foreground border-border"
              disabled={isSending || isRatingOpen}
            />
            {inputValue.trim() ? (
              <Button
                onClick={handleSend}
                disabled={isSending || isRatingOpen}
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleVoiceToggle}
                disabled={isRatingOpen}
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
