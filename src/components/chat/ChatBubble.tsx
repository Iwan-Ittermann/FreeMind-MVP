import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ThumbsUp, ThumbsDown, Sparkles, Flame } from 'lucide-react';

interface ChatBubbleProps {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: Date;
  reactions?: string[];
  onReact?: (reaction: string) => void;
  style?: React.CSSProperties;
}

const reactionEmojis = [
  { icon: Heart, label: 'love', color: 'text-rose-400' },
  { icon: ThumbsUp, label: 'agree', color: 'text-green-400' },
  { icon: ThumbsDown, label: 'disagree', color: 'text-orange-400' },
  { icon: Sparkles, label: 'insightful', color: 'text-yellow-400' },
  { icon: Flame, label: 'hot-take', color: 'text-red-400' },
];

export function ChatBubble({ 
  id, 
  content, 
  isOwn, 
  timestamp, 
  reactions = [],
  onReact,
  style 
}: ChatBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Random subtle animation offset for floating effect
  const floatDuration = 3 + Math.random() * 2;
  const floatDelay = Math.random() * 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: [0, -5, 0],
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: {
          duration: floatDuration,
          repeat: Infinity,
          repeatType: "reverse",
          delay: floatDelay,
          ease: "easeInOut",
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowReactions(false);
      }}
      className={`relative max-w-[280px] ${isOwn ? 'self-end' : 'self-start'}`}
      style={style}
    >
      {/* Glow effect */}
      <div 
        className={`absolute inset-0 rounded-2xl blur-xl opacity-30 transition-opacity ${
          isHovered ? 'opacity-50' : 'opacity-20'
        } ${isOwn ? 'bg-primary' : 'bg-secondary'}`}
      />
      
      {/* Bubble */}
      <div
        className={`relative px-4 py-3 rounded-2xl backdrop-blur-sm border transition-all ${
          isOwn 
            ? 'bg-primary/20 border-primary/30 text-white' 
            : 'bg-secondary/20 border-secondary/30 text-white'
        } ${isHovered ? 'border-opacity-60' : ''}`}
      >
        <p className="text-sm leading-relaxed">{content}</p>
        
        {/* Timestamp */}
        <p className="text-[10px] text-white/40 mt-1">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {reactions.map((r, i) => {
              const emoji = reactionEmojis.find(e => e.label === r);
              if (!emoji) return null;
              return (
                <span key={i} className={`text-xs ${emoji.color}`}>
                  <emoji.icon size={14} />
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Reaction picker */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute top-full mt-2 flex gap-1 p-1 bg-black/80 backdrop-blur-sm rounded-full border border-white/10 ${
            isOwn ? 'right-0' : 'left-0'
          }`}
        >
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji.label}
              onClick={() => onReact?.(emoji.label)}
              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${emoji.color}`}
            >
              <emoji.icon size={16} />
            </button>
          ))}
        </motion.div>
      )}

      {/* Connection line (decorative) */}
      <svg
        className="absolute -z-10 opacity-20"
        style={{
          top: '50%',
          [isOwn ? 'right' : 'left']: '100%',
          width: '40px',
          height: '2px',
        }}
      >
        <line
          x1="0"
          y1="1"
          x2="40"
          y2="1"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      </svg>
    </motion.div>
  );
}
