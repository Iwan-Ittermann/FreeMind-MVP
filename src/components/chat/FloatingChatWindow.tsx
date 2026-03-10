import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Minus, X, Heart, HeartCrack, Swords, Handshake, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { useChatSession } from '@/hooks/useChatSession';
import { useChatMessages } from '@/hooks/useChatMessages';
import { BOT_USER_ID } from '@/lib/constants';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface FloatingChatWindowProps {
  theirOpinionId: string;
  onMinimize: () => void;
  onClose: () => void;
  style?: React.CSSProperties;
  readOnly?: boolean;
  readOnlySourceId?: string;
  readOnlyTargetId?: string;
}

export function FloatingChatWindow({ theirOpinionId, onMinimize, onClose, style, readOnly, readOnlySourceId, readOnlyTargetId }: FloatingChatWindowProps) {
  const { t } = useTranslation();
  const {
    chatId, myOpinion, theirOpinion, theirUserId,
    saveRating, isSavingRating, existingRating, averageBridgingScore,
    isBotChat,
  } = useChatSession(theirOpinionId);

  const topicId = theirOpinion?.topic_id ?? null;
  const { messages: dbMessages, sendMessage, isSending, isBotTyping } = useChatMessages(
    chatId,
    isBotChat,
    topicId && myOpinion && theirOpinion
      ? { topicId, myOpinionId: myOpinion.id, theirOpinionId: theirOpinion.id }
      : undefined,
  );
  const { partnerTyping, setTyping } = useTypingIndicator(chatId);
  const { isBlocked, isBlockedByOther } = useUserBlocks(chatId, theirUserId);

  const [inputValue, setInputValue] = useState('');
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [empathy, setEmpathy] = useState(0);
  const [disagreement, setDisagreement] = useState(50);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize sliders from existing rating (only once when data arrives)
  useEffect(() => {
    if (existingRating && !initialized) {
      setEmpathy(existingRating.empathy);
      setDisagreement(existingRating.disagreement);
      setInitialized(true);
    }
  }, [existingRating, initialized]);

  const hasNeverRated = !existingRating;

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
    setInputValue('');
    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      await sendMessage(content);
    } catch {
      setInputValue(content);
    }
  };

  const handleSaveRating = async () => {
    try {
      await saveRating(empathy, disagreement);
      // Rating saved successfully
      setIsRatingOpen(false);
    } catch {
      toast.error(t('chat.failedToSaveRating'));
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (!isRatingOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dbMessages, isRatingOpen]);

  const displayMessages = [
    ...(theirOpinion ? [{
      id: 'opinion-theirs',
      content: theirOpinion.visible ? theirOpinion.text : (theirOpinion.notice_text || 'Hidden'),
      isOwn: false,
      timestamp: new Date(0),
      reactions: [] as string[],
      isOpinion: true,
      visible: theirOpinion.visible,
      noticeText: theirOpinion.notice_text,
    }] : []),
    ...(myOpinion ? [{
      id: 'opinion-mine',
      content: myOpinion.visible ? myOpinion.text : (myOpinion.notice_text || 'Hidden'),
      isOwn: true,
      timestamp: new Date(1),
      reactions: [] as string[],
      isOpinion: true,
      visible: myOpinion.visible,
      noticeText: myOpinion.notice_text,
    }] : []),
    ...dbMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isOwn: msg.isOwn,
      timestamp: msg.createdAt,
      reactions: [] as string[],
      isOpinion: false,
      visible: true,
      noticeText: null as string | null,
    })),
  ];

  const bridgingScore = empathy * disagreement;
  const getBridgingColor = (s: number) => s > 2500 ? 'text-green-400' : s >= 0 ? 'text-orange-400' : 'text-primary';

  const isLoading = !myOpinion || !theirOpinion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-16 z-50 w-[360px] h-[480px] bg-background border border-border/80 rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-border/20"
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted shrink-0">
        <p className="text-sm font-medium text-foreground truncate flex-1 mr-2">
          {isBotChat ? '🤖 AI Bot' : theirOpinion ? `"${theirOpinion.text.slice(0, 30)}${theirOpinion.text.length > 30 ? '…' : ''}"` : t('common.loading')}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground" onClick={onMinimize}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content area — toggles between messages and rating */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {isRatingOpen ? (
            <motion.div
              key="rating"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-4 overflow-y-auto flex flex-col"
            >
              {/* Close rating */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">{t('floatingChat.rateConversation')}</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRatingOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Respect slider */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span className="text-xs text-muted-foreground">{t('floatingChat.respect')}</span>
                  </div>
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
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <HeartCrack className="w-3 h-3" />
                  <Heart className="w-3 h-3" />
                </div>
              </div>

              {/* Disagreement slider */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-orange-400" />
                    <span className="text-xs text-muted-foreground">{t('floatingChat.disagreement')}</span>
                  </div>
                  <span className="text-xs font-mono text-orange-400">{disagreement}</span>
                </div>
                <Slider
                  value={[disagreement]}
                  onValueChange={(v) => setDisagreement(v[0])}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-orange-400 [&_[role=slider]]:border-orange-400 [&_.bg-primary]:bg-orange-400/30"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <Handshake className="w-3 h-3" />
                  <Swords className="w-3 h-3" />
                </div>
              </div>

              {/* Bridging score */}
              <div className="text-center mb-4">
                <span className="text-xs text-muted-foreground">{t('floatingChat.bridgingScore')}</span>
                <span className={`text-sm font-bold ml-1 ${getBridgingColor(bridgingScore)}`}>
                  {bridgingScore.toLocaleString()}
                </span>
              </div>

              {/* Save & Close */}
              <Button
                onClick={handleSaveRating}
                disabled={isSavingRating}
                className="w-full mt-auto"
              >
                <Check className="w-4 h-4 mr-2" />
                {isSavingRating ? t('floatingChat.saving') : t('floatingChat.saveAndClose')}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto px-3 py-3"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t('common.loadingChat')}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayMessages.map(msg => (
                    <ChatBubble
                      key={msg.id}
                      id={msg.id}
                      content={msg.content}
                      isOwn={msg.isOwn}
                      timestamp={msg.timestamp}
                      reactions={msg.reactions}
                      isOpinion={msg.isOpinion}
                      onReact={() => {}}
                      visible={msg.visible}
                      noticeText={msg.noticeText}
                      isBotMessage={isBotChat && !msg.isOwn}
                    />
                  ))}
                  <AnimatePresence>
                    {(partnerTyping.isTyping || isBotTyping) && <TypingIndicator userName={isBotTyping ? 'AI Bot' : partnerTyping.userName} />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer — input + Rate! button (hidden in read-only mode) */}
      {!readOnly && (
        <div className="border-t border-border p-2 shrink-0 bg-muted/80">
          {isBlocked || isBlockedByOther ? (
            <p className="text-xs text-muted-foreground text-center py-1">
              {isBlocked ? t('floatingChat.blockedByYou') : t('floatingChat.blockedByThem')}
            </p>
          ) : (
            <div className="flex items-center gap-1.5">
              {!isBotChat && (
                <Button
                  variant={isRatingOpen ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsRatingOpen(!isRatingOpen)}
                  className={`shrink-0 text-xs h-8 px-2.5 border-foreground/30 text-foreground ${hasNeverRated && !isRatingOpen ? 'animate-pulse' : ''}`}
                  data-chat-tutorial="rating-scales"
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
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending || isRatingOpen}
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
      {readOnly && (
        <div className="border-t border-border p-2 shrink-0 bg-muted/80">
          <p className="text-xs text-muted-foreground text-center py-1">{t('floatingChat.readOnly', 'Read-only view')}</p>
        </div>
      )}

    </motion.div>
  );
}

