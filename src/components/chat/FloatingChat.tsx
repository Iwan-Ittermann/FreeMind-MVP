import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Languages, Check, ChevronRight, ChevronLeft, Ban, Unlock, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { VerticalRatingSlider } from './VerticalRatingSlider';
import { AIConciliateButton } from './AIConciliateButton';
import { MiniGraph } from './MiniGraph';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface OpinionData {
  text: string;
  visible: boolean;
  notice_text: string | null;
}

interface FloatingChatProps {
  chatId: string | null;
  topicId?: string;
  myOpinion: OpinionData;
  theirOpinion: OpinionData;
  myOpinionId?: string;
  theirOpinionId?: string;
  theirUserId?: string | null;
  onClose: () => void;
  onSubmitRating?: (empathy: number, disagreement: number) => void;
  isSavingRating?: boolean;
  isReadOnly?: boolean;
  initialEmpathy?: number;
  initialDisagreement?: number;
  hasExistingRating?: boolean;
  averageBridgingScore?: number | null;
  isBotChat?: boolean;
}

export function FloatingChat({ 
  chatId,
  topicId,
  myOpinion, 
  theirOpinion,
  myOpinionId,
  theirOpinionId,
  theirUserId,
  onClose,
  onSubmitRating,
  isSavingRating = false,
  isReadOnly = false,
  initialEmpathy,
  initialDisagreement,
  averageBridgingScore,
  hasExistingRating = false,
  isBotChat = false,
}: FloatingChatProps) {
  const { t } = useTranslation();
  const { messages: dbMessages, sendMessage, sendVoiceMessage, isSending, isBotTyping } = useChatMessages(
    chatId,
    isBotChat,
    topicId && myOpinionId && theirOpinionId
      ? { topicId, myOpinionId, theirOpinionId }
      : undefined,
  );
  const { partnerTyping, setTyping } = useTypingIndicator(chatId);
  const { isBlocked, isBlockedByOther, blockUser, unblockUser, isBlocking, isUnblocking } = useUserBlocks(chatId, theirUserId || null);
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const [inputValue, setInputValue] = useState('');
  const [translateEnabled, setTranslateEnabled] = useState(false);
  // Empathy only: -50 to +50
  const [empathy, setEmpathy] = useState(initialEmpathy ?? 0);
  const [savedEmpathy, setSavedEmpathy] = useState(initialEmpathy ?? 0);
  const [mobileLeftSliderOpen, setMobileLeftSliderOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (!isReadOnly && value.trim()) {
      setTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
    } else {
      setTyping(false);
    }
  }, [isReadOnly, setTyping]);

  const hasUnsavedChanges = empathy !== savedEmpathy;

  const displayMessages = [
    {
      id: 'opinion-theirs',
      content: theirOpinion.visible ? theirOpinion.text : (theirOpinion.notice_text || 'This content has been hidden.'),
      isOwn: false,
      timestamp: new Date(0),
      reactions: [] as string[],
      isOpinion: true,
      visible: theirOpinion.visible,
      noticeText: theirOpinion.notice_text,
    },
    {
      id: 'opinion-mine',
      content: myOpinion.visible ? myOpinion.text : (myOpinion.notice_text || 'This content has been hidden.'),
      isOwn: true,
      timestamp: new Date(1),
      reactions: [] as string[],
      isOpinion: true,
      visible: myOpinion.visible,
      noticeText: myOpinion.notice_text,
    },
    ...dbMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isOwn: msg.isOwn,
      timestamp: msg.createdAt,
      reactions: [] as string[],
      isOpinion: false,
      visible: true,
      noticeText: null as string | null,
      audioUrl: msg.audioUrl,
      transcript: msg.transcript,
    })),
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbMessages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    const content = inputValue;
    setInputValue('');
    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
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

  const handleReaction = (messageId: string, reaction: string) => {
    console.log('Reaction:', messageId, reaction);
  };

  const handleSaveRating = () => {
    // Save empathy only; pass existing disagreement for DB compatibility
    onSubmitRating?.(empathy, initialDisagreement ?? 50);
    setSavedEmpathy(empathy);
  };

  const myBridgingScore = empathy * (initialDisagreement ?? 50);
  const displayBridgingScore = averageBridgingScore ?? myBridgingScore;

  const getBridgingScoreColor = (score: number) => {
    if (score > 2500) return 'text-green-400';
    if (score >= 0) return 'text-orange-400';
    return 'text-primary';
  };

  const handleBlock = async () => {
    try {
      await blockUser();
      toast.success(t('floatingChat.userBlocked'));
    } catch (err) {
      toast.error(t('floatingChat.failedToBlock'));
    }
  };

  const handleUnblock = async () => {
    try {
      await unblockUser();
      toast.success(t('floatingChat.userUnblocked'));
    } catch (err) {
      toast.error(t('floatingChat.failedToUnblock'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-white/60 hover:text-white hover:bg-white/5 h-10 px-3"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        
        <div className="flex items-center gap-4">
          {topicId && (
            <div className="hidden sm:block" data-chat-tutorial="mini-graph">
              <MiniGraph
                topicId={topicId}
                myOpinionId={myOpinionId}
                theirOpinionId={theirOpinionId}
                size={80}
              />
            </div>
          )}
          
          <div className="text-center" data-chat-tutorial="bridging-score">
            <p className="text-sm font-medium text-white">
              {isReadOnly ? 'Viewing Discussion' : isBotChat ? '🤖 AI Bot' : 'Discussion'}
            </p>
            {isReadOnly ? (
              <p className="text-xs text-white/40">Read-only mode</p>
            ) : (
              <p className={`text-xs ${getBridgingScoreColor(displayBridgingScore)}`}>
                Bridging Score:{' '}
                <motion.span
                  key={displayBridgingScore}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="font-mono font-bold inline-block"
                >
                  {displayBridgingScore.toLocaleString()}
                </motion.span>
                {averageBridgingScore !== null && (
                  <span className="text-white/40 ml-1">(avg)</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isReadOnly && !isBotChat && theirUserId && (
            <Button
              variant="ghost"
              onClick={isBlocked ? handleUnblock : handleBlock}
              disabled={isBlocking || isUnblocking}
              className={`h-10 w-10 p-0 ${isBlocked ? 'text-destructive bg-destructive/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              title={isBlocked ? 'Unblock user' : 'Block user'}
            >
              {isBlocked ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setTranslateEnabled(!translateEnabled)}
            className={`h-10 w-10 p-0 ${translateEnabled ? 'text-purple-400 bg-purple-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            title="Auto-translate"
          >
            <Languages className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Left rail - Empathy slider only (hidden in read-only and bot chats) */}
        {!isReadOnly && !isBotChat && (
          <div className="hidden md:flex flex-col items-center justify-center w-20 border-r border-white/10 bg-black/50 py-6" data-chat-tutorial="rating-scales">
            <VerticalRatingSlider
              value={empathy}
              onChange={setEmpathy}
              label={t('floatingChat.respect')}
              color="rose"
              lowLabel={t('floatingChat.disrespectful')}
              highLabel={t('floatingChat.respectful')}
              min={-50}
              max={50}
              hasUnsavedChanges={hasUnsavedChanges}
              onSave={handleSaveRating}
              isSaving={isSavingRating}
            />
          </div>
        )}

        {/* Center - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-lg mx-auto space-y-3">
              <div className="text-center py-4">
                <p className="text-xs text-white/40">
                  Your opinions are shown below. Start a conversation to understand each other's perspective.
                </p>
              </div>

              <AnimatePresence>
                {displayMessages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    isOwn={msg.isOwn}
                    timestamp={msg.timestamp}
                    reactions={[]}
                    isOpinion={msg.isOpinion}
                    onReact={(reaction) => handleReaction(msg.id, reaction)}
                    visible={msg.visible}
                    noticeText={msg.noticeText}
                    isBotMessage={isBotChat && !msg.isOwn}
                  />
                ))}
              </AnimatePresence>
              
              <AnimatePresence>
                {(partnerTyping.isTyping || isBotTyping) && (
                  <TypingIndicator userName={isBotTyping ? 'AI Bot' : partnerTyping.userName} />
                )}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          {!isReadOnly && (
            <>
              {isBlocked ? (
                <div className="border-t border-destructive/20 bg-destructive/5 p-4">
                  <div className="max-w-lg mx-auto text-center">
                    <p className="text-sm text-destructive mb-3">
                      You have blocked this user. Unblock to continue chatting.
                    </p>
                    <Button
                      onClick={handleUnblock}
                      disabled={isUnblocking}
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      {isUnblocking ? 'Unblocking...' : 'Unblock User'}
                    </Button>
                  </div>
                </div>
              ) : isBlockedByOther ? (
                <div className="border-t border-white/10 bg-muted/20 p-4">
                  <p className="text-center text-sm text-white/40">
                    This user has limited their chat. You cannot send messages.
                  </p>
                </div>
              ) : (
                <div className="border-t border-white/10 bg-black">
                  {/* Mobile rating button - empathy only (hidden for bot chats) */}
                  {!isBotChat && (
                  <div className="md:hidden flex justify-center items-center px-4 py-2 border-b border-white/5" data-chat-tutorial="rating-scales-mobile">
                    <div className="relative">
                      <button
                        onClick={() => setMobileLeftSliderOpen(!mobileLeftSliderOpen)}
                        className="h-10 px-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2"
                      >
                        <span className="w-2 h-6 rounded-full bg-rose-400" />
                        <span className="text-xs text-rose-400 font-bold">{empathy}</span>
                      </button>
                      <AnimatePresence>
                        {mobileLeftSliderOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 320, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute bottom-full left-0 mb-2 overflow-hidden"
                          >
                            <div className="h-80 w-16 bg-black/95 border border-white/10 rounded-lg flex items-center justify-center py-2">
                              <VerticalRatingSlider
                                value={empathy}
                                onChange={setEmpathy}
                                label={t('floatingChat.respect')}
                                color="rose"
                                lowLabel={t('floatingChat.disrespectful')}
                                highLabel={t('floatingChat.respectful')}
                                min={-50}
                                max={50}
                                compact
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Save button */}
                    <motion.button
                      onClick={handleSaveRating}
                      disabled={isSavingRating}
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ml-3 ${
                        hasUnsavedChanges
                          ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-black' 
                          : 'bg-white/10'
                      }`}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Check className={`w-4 h-4 ${hasUnsavedChanges ? 'text-white' : 'text-white/40'}`} />
                    </motion.button>
                  </div>
                  )}

                  {/* Input area */}
                  <div className="p-4">
                    <div className="max-w-lg mx-auto">
                      {isRecording ? (
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-red-500/50 h-12 rounded-full px-5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 text-sm font-mono">{formatDuration(duration)}</span>
                            <span className="text-white/50 text-sm">Recording...</span>
                          </div>
                          <Button
                            onClick={handleVoiceToggle}
                            className="bg-red-500 hover:bg-red-600 h-12 w-12 rounded-full p-0 flex-shrink-0"
                          >
                            <Square className="w-4 h-4 fill-current" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={inputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Type a message..."
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-full px-5 text-base"
                            disabled={isSending}
                          />
                          {inputValue.trim() ? (
                            <Button 
                              onClick={handleSend}
                              disabled={isSending}
                              className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-full p-0 flex-shrink-0"
                            >
                              <Send className="w-5 h-5" />
                            </Button>
                          ) : (
                            <Button
                              onClick={handleVoiceToggle}
                              className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-full p-0 flex-shrink-0"
                            >
                              <Mic className="w-5 h-5" />
                            </Button>
                          )}
                          <div className="hidden md:block">
                            <AIConciliateButton compact />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {isReadOnly && (
            <div className="border-t border-white/10 bg-black/50 p-4">
              <p className="text-center text-sm text-white/40">
                You are viewing this conversation in read-only mode
              </p>
            </div>
          )}
        </div>

        {/* No more right rail (disagreement removed from chat) */}
      </div>
    </div>
  );
}
