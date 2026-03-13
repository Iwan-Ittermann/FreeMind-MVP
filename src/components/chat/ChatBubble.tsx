import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Quote, AlertTriangle } from 'lucide-react';

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
  isBotMessage?: boolean;
}

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(function ChatBubble({ 
  id, 
  content, 
  isOwn, 
  timestamp, 
  isOpinion = false,
  visible = true,
  noticeText,
  isBotMessage = false,
}: ChatBubbleProps, ref) {

  // Show notice for hidden content
  if (!visible && noticeText) {
    return (
      <motion.div
        ref={ref}
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
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
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
                  ? 'bg-primary/40 border border-primary/50 rounded-br-md' 
                  : 'bg-primary rounded-br-md shadow-lg shadow-primary/20'
                : isBotMessage
                  ? 'bg-white rounded-bl-md shadow-sm'
                  : isOpinion
                    ? 'bg-secondary/40 border border-secondary/50 rounded-bl-md'
                    : 'bg-muted rounded-bl-md'
            }`}
          >
            <p className={`text-sm leading-relaxed ${isBotMessage && !isOwn ? 'text-black' : isOwn && !isOpinion ? 'text-white' : 'text-foreground'}`}>
              {content}
            </p>
          </motion.div>

          {/* Timestamp */}
          <p className={`text-[10px] text-white/30 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

        </div>
    </motion.div>
  );
});
