import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface MinimizedChatBubbleProps {
  opinionText: string;
  unreadCount: number;
  onClick: () => void;
}

export function MinimizedChatBubble({ opinionText, unreadCount, onClick }: MinimizedChatBubbleProps) {
  const letter = opinionText.trim().charAt(0).toUpperCase() || '?';

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative h-12 w-12 rounded-full bg-muted border border-border/50 flex items-center justify-center text-foreground font-semibold text-lg shadow-lg hover:bg-muted/80 transition-colors"
      title={opinionText}
    >
      {letter}
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </motion.button>
  );
}
