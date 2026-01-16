import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ThumbsUp, ThumbsDown, Sparkles, Flame, Quote, Flag, AlertTriangle } from 'lucide-react';
import { ReportDialog } from '@/components/moderation/ReportDialog';

interface ChatBubbleProps {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: Date;
  reactions?: string[];
  isOpinion?: boolean;
  onReact?: (reaction: string) => void;
  visible?: boolean;
  noticeText?: string;
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
  isOpinion = false,
  onReact,
  visible = true,
  noticeText,
}: ChatBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Show notice for hidden content
  if (!visible && noticeText) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className="max-w-[85%] p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p>{noticeText}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
      >
        <div className={`relative max-w-[85%] group`}>
          {/* Opinion label */}
          {isOpinion && (
            <div className={`flex items-center gap-1.5 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <Quote className={`w-3 h-3 ${isOwn ? 'text-primary/60' : 'text-secondary/60'}`} />
              <span className={`text-[10px] font-medium uppercase tracking-wider ${isOwn ? 'text-primary/60' : 'text-secondary/60'}`}>
                {isOwn ? 'Your opinion' : 'Their opinion'}
              </span>
            </div>
          )}

          {/* Bubble */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`px-4 py-3 rounded-2xl ${
              isOwn 
                ? isOpinion 
                  ? 'bg-primary/20 border border-primary/30 rounded-br-md' 
                  : 'bg-primary rounded-br-md shadow-lg shadow-primary/20'
                : isOpinion
                  ? 'bg-secondary/20 border border-secondary/30 rounded-bl-md'
                  : 'bg-white/10 rounded-bl-md'
            }`}
          >
            <p className={`text-sm leading-relaxed ${isOwn && !isOpinion ? 'text-white' : 'text-white/90'}`}>
              {content}
            </p>
          </motion.div>

          {/* Timestamp */}
          <p className={`text-[10px] text-white/30 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Reactions display */}
          {reactions.length > 0 && (
            <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
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

          {/* Reaction picker with report button */}
          {showReactions && !isOpinion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`absolute -top-10 flex gap-1 p-1.5 bg-black/90 backdrop-blur-sm rounded-full border border-white/10 shadow-lg ${
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
              {/* Report button */}
              <button
                onClick={() => setReportDialogOpen(true)}
                className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors text-white/40 hover:text-destructive"
                title="Inhalt melden"
              >
                <Flag size={16} />
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentId={id}
        contentType="ChatMessage"
        contentPreview={content}
      />
    </>
  );
}