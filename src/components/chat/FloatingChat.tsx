import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { VerticalRatingSlider } from './VerticalRatingSlider';
import { AIConciliateButton } from './AIConciliateButton';
import { useChatMessages, ChatMessage } from '@/hooks/useChatMessages';

interface FloatingChatProps {
  chatId: string | null;
  myOpinion: string;
  theirOpinion: string;
  myOpinionId?: string;
  theirOpinionId?: string;
  onClose: () => void;
  onSubmitRating?: (empathy: number, disagreement: number) => void;
  isSavingRating?: boolean;
  isReadOnly?: boolean;
}

export function FloatingChat({ 
  chatId,
  myOpinion, 
  theirOpinion,
  myOpinionId,
  theirOpinionId,
  onClose,
  onSubmitRating,
  isSavingRating = false,
  isReadOnly = false,
}: FloatingChatProps) {
  const { messages: dbMessages, sendMessage, isSending } = useChatMessages(chatId);
  const [inputValue, setInputValue] = useState('');
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [empathy, setEmpathy] = useState(0.5);
  const [disagreement, setDisagreement] = useState(0.5);
  const [savedEmpathy, setSavedEmpathy] = useState(0.5);
  const [savedDisagreement, setSavedDisagreement] = useState(0.5);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasUnsavedChanges = empathy !== savedEmpathy || disagreement !== savedDisagreement;

  // Build display messages: opinions first, then DB messages
  const displayMessages = [
    {
      id: 'opinion-theirs',
      content: theirOpinion,
      isOwn: false,
      timestamp: new Date(0), // Earliest
      reactions: [] as string[],
      isOpinion: true,
    },
    {
      id: 'opinion-mine',
      content: myOpinion,
      isOwn: true,
      timestamp: new Date(1), // Second earliest
      reactions: [] as string[],
      isOpinion: true,
    },
    ...dbMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isOwn: msg.isOwn,
      timestamp: msg.createdAt,
      reactions: [] as string[],
      isOpinion: false,
    })),
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbMessages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    
    const content = inputValue;
    setInputValue('');
    
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputValue(content); // Restore input on error
    }
  };

  const handleReaction = (messageId: string, reaction: string) => {
    // TODO: Implement reactions in DB
    console.log('Reaction:', messageId, reaction);
  };

  const handleSaveRating = () => {
    onSubmitRating?.(empathy, disagreement);
    setSavedEmpathy(empathy);
    setSavedDisagreement(disagreement);
  };

  // Calculate Bridging Score: empathy points * disagreement points
  const empathyPoints = Math.round(empathy * 100);
  const disagreementPoints = Math.round(disagreement * 100);
  const bridgingScore = empathyPoints * disagreementPoints;

  const getBridgingScoreColor = () => {
    if (bridgingScore >= 7500) return 'text-green-400';
    if (bridgingScore >= 2500) return 'text-yellow-400';
    return 'text-primary';
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
        
        <div className="text-center">
          <p className="text-sm font-medium text-white">
            {isReadOnly ? 'Viewing Discussion' : 'Discussion'}
          </p>
          {isReadOnly ? (
            <p className="text-xs text-white/40">Read-only mode</p>
          ) : (
            <p className={`text-xs ${getBridgingScoreColor()}`}>
              Bridging Score: <span className="font-mono font-bold">{bridgingScore.toLocaleString()}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
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

      {/* Main content with side rails */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left rail - Empathy slider (hidden in read-only) */}
        {!isReadOnly && (
          <div className="hidden md:flex flex-col items-center justify-center w-20 border-r border-white/10 bg-black/50 py-6">
            <VerticalRatingSlider
              value={empathy}
              onChange={setEmpathy}
              label="Empathy"
              color="rose"
              lowLabel="Cold"
              highLabel="Warm"
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
              {/* Intro text */}
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
                    reactions={msg.reactions}
                    isOpinion={msg.isOpinion}
                    onReact={(reaction) => handleReaction(msg.id, reaction)}
                  />
                ))}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area (hidden in read-only) */}
          {!isReadOnly && (
            <div className="border-t border-white/10 bg-black p-4">
              <div className="max-w-lg mx-auto">
                <div className="flex gap-2 items-center">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-full px-5 text-base"
                    disabled={isSending}
                  />
                  <Button 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending}
                    className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-full p-0 flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                  <div className="hidden md:block">
                    <AIConciliateButton compact />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Read-only indicator */}
          {isReadOnly && (
            <div className="border-t border-white/10 bg-black/50 p-4">
              <p className="text-center text-sm text-white/40">
                You are viewing this conversation in read-only mode
              </p>
            </div>
          )}
        </div>

        {/* Right rail - Disagreement slider (hidden in read-only) */}
        {!isReadOnly && (
          <div className="hidden md:flex flex-col items-center justify-center w-20 border-l border-white/10 bg-black/50 py-6">
            <VerticalRatingSlider
              value={disagreement}
              onChange={setDisagreement}
              label="Disagree"
              color="orange"
              lowLabel="Aligned"
              highLabel="Opposed"
              hasUnsavedChanges={hasUnsavedChanges}
              onSave={handleSaveRating}
              isSaving={isSavingRating}
            />
          </div>
        )}
      </div>

      {/* Mobile rating bar (hidden in read-only) */}
      {!isReadOnly && (
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-t border-white/10 bg-black/95">
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-rose-400 mb-1">Empathy: {Math.round(empathy * 100)}</p>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(empathy * 100)}
                onChange={(e) => setEmpathy(Number(e.target.value) / 100)}
                className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-orange-400 mb-1">Disagree: {Math.round(disagreement * 100)}</p>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(disagreement * 100)}
                onChange={(e) => setDisagreement(Number(e.target.value) / 100)}
                className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-400 [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>
          <motion.button
            onClick={handleSaveRating}
            disabled={isSavingRating}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              hasUnsavedChanges
                ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-black' 
                : 'bg-white/10'
            }`}
            whileTap={{ scale: 0.9 }}
          >
            <Check className={`w-4 h-4 ${hasUnsavedChanges ? 'text-white' : 'text-white/40'}`} />
          </motion.button>
          <AIConciliateButton compact />
        </div>
      )}
    </div>
  );
}
