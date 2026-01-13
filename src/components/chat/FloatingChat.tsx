import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, ChevronUp, ChevronDown, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { RatingSliders } from './RatingSliders';
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
  // Initialize messages with opinions as the first two messages
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
  const [showRatingPanel, setShowRatingPanel] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          Back
        </Button>
        
        <div className="text-center">
          <p className="text-sm font-medium text-white">Discussion</p>
          <p className="text-xs text-white/40">Understanding perspectives</p>
        </div>

        <Button
          variant="ghost"
          onClick={() => setTranslateEnabled(!translateEnabled)}
          className={`h-10 px-3 ${translateEnabled ? 'text-purple-400 bg-purple-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          <Languages className="w-5 h-5" />
          {translateEnabled && <span className="ml-2 text-xs hidden sm:inline">On</span>}
        </Button>
      </div>

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

      {/* Rating Panel - Collapsible */}
      <AnimatePresence>
        {showRatingPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-black/95 overflow-hidden"
          >
            <div className="max-w-lg mx-auto p-4 space-y-4">
              <RatingSliders onSubmitRating={onSubmitRating} isSaving={isSavingRating} />
              <AIConciliateButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-black p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Toggle Rating Panel */}
          <button
            onClick={() => setShowRatingPanel(!showRatingPanel)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {showRatingPanel ? (
              <>
                <ChevronDown className="w-4 h-4" />
                Hide rating & AI tools
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                Rate conversation & AI tools
              </>
            )}
          </button>

          {/* Input */}
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}