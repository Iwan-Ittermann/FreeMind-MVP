import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Languages } from 'lucide-react';
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
}

interface FloatingChatProps {
  myOpinion: string;
  theirOpinion: string;
  onClose: () => void;
  onSubmitRating?: (empathy: number, disagreement: number) => void;
}

export function FloatingChat({ 
  myOpinion, 
  theirOpinion, 
  onClose,
  onSubmitRating,
}: FloatingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].isOwn) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        
        // Simulate response after typing
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
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Background decoration - hidden on mobile for performance */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/10"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: [null, Math.random() * window.innerWidth],
              y: [null, Math.random() * window.innerHeight],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
        
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.line
              key={i}
              x1="10%"
              y1={`${20 + i * 15}%`}
              x2="90%"
              y2={`${30 + i * 12}%`}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: i * 0.2 }}
            />
          ))}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Header - Fixed at top */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-white/60 hover:text-white h-10 px-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Graph</span>
          <span className="sm:hidden">Back</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setTranslateEnabled(!translateEnabled)}
          className={`${translateEnabled ? 'text-purple-400' : 'text-white/60'} hover:text-purple-300 h-10 px-3`}
        >
          <Languages className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Auto-translate</span>
          {translateEnabled && <span className="ml-2 text-xs hidden sm:inline">(Mock)</span>}
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col lg:flex-row flex-1 w-full max-w-6xl mx-auto overflow-hidden">
        {/* Opinions display - Collapsible on mobile */}
        <div className="flex-shrink-0 lg:w-64 px-4 py-3 lg:py-4 space-y-2 lg:space-y-4 bg-black/50 lg:bg-transparent border-b lg:border-b-0 border-white/10">
          <div className="flex lg:flex-col gap-2 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
              <p className="text-xs text-primary mb-1">Your Opinion</p>
              <p className="text-sm text-white/80 line-clamp-2 lg:line-clamp-3">{myOpinion}</p>
            </div>
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
              <p className="text-xs text-secondary mb-1">Their Opinion</p>
              <p className="text-sm text-white/80 line-clamp-2 lg:line-clamp-3">{theirOpinion}</p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 md:gap-4">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <ChatBubble
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  isOwn={msg.isOwn}
                  timestamp={msg.timestamp}
                  reactions={msg.reactions}
                  onReact={(reaction) => handleReaction(msg.id, reaction)}
                  style={{
                    marginLeft: msg.isOwn ? 'auto' : '0',
                    marginRight: msg.isOwn ? '0' : 'auto',
                    maxWidth: '85%',
                  }}
                />
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="self-start"
              >
                <TypingIndicator />
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-black/80 backdrop-blur-sm">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Share your thoughts..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 md:h-10 text-base md:text-sm"
              />
              <Button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-primary hover:bg-primary/90 h-12 md:h-10 w-12 md:w-10 p-0"
              >
                <Send className="w-5 h-5 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Rating panel - Bottom sheet on mobile */}
        <div className="flex-shrink-0 lg:w-72 p-4 space-y-4 border-t lg:border-t-0 border-white/10 bg-black/80 lg:bg-transparent">
          <RatingSliders onRatingChange={onSubmitRating} />
          <AIConciliateButton />
        </div>
      </div>
    </div>
  );
}
