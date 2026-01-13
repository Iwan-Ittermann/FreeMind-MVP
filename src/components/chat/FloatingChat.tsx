import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { VerticalRatingSlider } from './VerticalRatingSlider';
import { AIConciliateButton } from './AIConciliateButton';

interface Message {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: Date;
  reactions: string[];
  isOpinion?: boolean;
}

interface FloatingChatProps {
  myOpinion: string;
  theirOpinion: string;
  onClose: () => void;
  onSubmitRating?: (empathy: number, disagreement: number) => void;
  isSavingRating?: boolean;
}

export function FloatingChat({ 
  myOpinion, 
  theirOpinion, 
  onClose,
  onSubmitRating,
  isSavingRating = false,
}: FloatingChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'opinion-theirs',
      content: theirOpinion,
      isOwn: false,
      timestamp: new Date(Date.now() - 60000),
      reactions: [],
      isOpinion: true,
    },
    {
      id: 'opinion-mine',
      content: myOpinion,
      isOwn: true,
      timestamp: new Date(Date.now() - 30000),
      reactions: [],
      isOpinion: true,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [empathy, setEmpathy] = useState(0.5);
  const [disagreement, setDisagreement] = useState(0.5);
  const [savedEmpathy, setSavedEmpathy] = useState(0.5);
  const [savedDisagreement, setSavedDisagreement] = useState(0.5);
  const [isSavingEmpathy, setIsSavingEmpathy] = useState(false);
  const [isSavingDisagreement, setIsSavingDisagreement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const empathyHasChanges = empathy !== savedEmpathy;
  const disagreementHasChanges = disagreement !== savedDisagreement;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 2 && messages[messages.length - 1].isOwn && !messages[messages.length - 1].isOpinion) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: `msg-${Date.now()}`,
            content: getMockResponse(),
            isOwn: false,
            timestamp: new Date(),
            reactions: [],
          }]);
        }, 2000 + Math.random() * 1000);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const getMockResponse = () => {
    const responses = [
      "That's an interesting perspective. I hadn't thought about it that way.",
      "I see where you're coming from, but have you considered...?",
      "We might disagree, but I appreciate you sharing your view.",
      "Help me understand - what led you to that conclusion?",
      "I think we actually agree on the core issue, just not the approach.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      content: inputValue,
      isOwn: true,
      timestamp: new Date(),
      reactions: [],
    }]);
    setInputValue('');
  };

  const handleReaction = (messageId: string, reaction: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: [...msg.reactions, reaction] }
        : msg
    ));
  };

  const handleSaveEmpathy = () => {
    setIsSavingEmpathy(true);
    onSubmitRating?.(empathy, savedDisagreement);
    setTimeout(() => {
      setSavedEmpathy(empathy);
      setIsSavingEmpathy(false);
    }, 500);
  };

  const handleSaveDisagreement = () => {
    setIsSavingDisagreement(true);
    onSubmitRating?.(savedEmpathy, disagreement);
    setTimeout(() => {
      setSavedDisagreement(disagreement);
      setIsSavingDisagreement(false);
    }, 500);
  };

  const handleSaveBothRatings = () => {
    onSubmitRating?.(empathy, disagreement);
    setSavedEmpathy(empathy);
    setSavedDisagreement(disagreement);
  };

  // Calculate Bridging Score: empathy points * disagreement points / 100
  // Both are 0-100, so we divide by 100 to get 0-100 range
  const empathyPoints = Math.round(empathy * 100);
  const disagreementPoints = Math.round(disagreement * 100);
  const bridgingScore = Math.round((empathyPoints * disagreementPoints) / 100);

  // Get bridging score color based on value
  const getBridgingScoreColor = () => {
    if (bridgingScore >= 50) return 'text-green-400';
    if (bridgingScore >= 25) return 'text-yellow-400';
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
          <p className="text-sm font-medium text-white">Discussion</p>
          <p className={`text-xs ${getBridgingScoreColor()}`}>
            Bridging Score: <span className="font-mono font-bold">{bridgingScore}</span>
          </p>
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
        {/* Left rail - Empathy slider */}
        <div className="hidden md:flex flex-col items-center justify-center w-20 border-r border-white/10 bg-black/50 py-6">
          <VerticalRatingSlider
            value={empathy}
            onChange={setEmpathy}
            label="Empathy"
            color="rose"
            lowLabel="Cold"
            highLabel="Warm"
            hasUnsavedChanges={empathyHasChanges}
            onSave={handleSaveEmpathy}
            isSaving={isSavingEmpathy}
          />
        </div>

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
                {messages.map((msg) => (
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
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <TypingIndicator />
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area with AI button */}
          <div className="border-t border-white/10 bg-black p-4">
            <div className="max-w-lg mx-auto">
              <div className="flex gap-2 items-center">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-full px-5 text-base"
                />
                <Button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
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
        </div>

        {/* Right rail - Disagreement slider */}
        <div className="hidden md:flex flex-col items-center justify-center w-20 border-l border-white/10 bg-black/50 py-6">
          <VerticalRatingSlider
            value={disagreement}
            onChange={setDisagreement}
            label="Disagree"
            color="orange"
            lowLabel="Aligned"
            highLabel="Opposed"
            hasUnsavedChanges={disagreementHasChanges}
            onSave={handleSaveDisagreement}
            isSaving={isSavingDisagreement}
          />
        </div>
      </div>

      {/* Mobile rating bar + AI button */}
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
          onClick={handleSaveBothRatings}
          disabled={isSavingRating}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            (empathyHasChanges || disagreementHasChanges)
              ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-black' 
              : 'bg-white/10'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          <Check className={`w-4 h-4 ${(empathyHasChanges || disagreementHasChanges) ? 'text-white' : 'text-white/40'}`} />
        </motion.button>
        <AIConciliateButton compact />
      </div>
    </div>
  );
}
