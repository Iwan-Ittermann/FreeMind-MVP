import { forwardRef, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Quote, AlertTriangle, Eye, Reply, Mic, Loader2 } from 'lucide-react';
import type { ChatReaction } from '@/hooks/useChatReactions';
import { getVoiceSignedUrl } from '@/lib/voice-message-url';

interface ChatBubbleProps {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: Date;
  reactions?: ChatReaction[];
  isOpinion?: boolean;
  onReact?: (reaction: string) => void;
  visible?: boolean;
  noticeText?: string | null;
  isBotMessage?: boolean;
  replyToContent?: string;
  onReply?: () => void;
  onReaction?: (type: string) => void;
  hasISeenYou?: boolean;
  audioUrl?: string | null;
  transcript?: string | null;
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
  replyToContent,
  reactions = [],
  onReply,
  onReaction,
  hasISeenYou = false,
  audioUrl,
  transcript,
}: ChatBubbleProps, ref) {
  const [showActions, setShowActions] = useState(false);
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!audioUrl) { setSignedAudioUrl(null); return; }
    getVoiceSignedUrl(audioUrl).then((url) => {
      if (!cancelled) setSignedAudioUrl(url);
    });
    return () => { cancelled = true; };
  }, [audioUrl]);


  const showMenu = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    setShowActions(true);
  }, []);

  const hideMenu = useCallback(() => {
    hideTimer.current = setTimeout(() => setShowActions(false), 200);
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isOwn || isOpinion) return;
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  }, [isOwn, isOpinion]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const iSeenYouCount = reactions.filter(r => r.reactionType === 'i_see_you').length;

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
      transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Wrapper with generous hover area including the action menu zone */}
      <div
        className={`relative max-w-[85%]`}
        onMouseEnter={() => !isOwn && !isOpinion && showMenu()}
        onMouseLeave={hideMenu}
        style={{ paddingTop: !isOwn && !isOpinion ? '40px' : undefined, marginTop: !isOwn && !isOpinion ? '-40px' : undefined }}
      >
        {/* Reply preview */}
        {replyToContent && (
          <div className={`mb-1 px-3 py-1.5 rounded-lg bg-muted/60 border-l-2 border-primary/40 ${isOwn ? 'ml-auto' : ''}`}>
            <p className="text-[10px] text-muted-foreground line-clamp-2">↩ {replyToContent}</p>
          </div>
        )}

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
          {audioUrl ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Mic className={`w-3.5 h-3.5 flex-shrink-0 ${isOwn && !isOpinion ? 'text-white/70' : 'text-muted-foreground'}`} />
                <audio
                  controls
                  preload="metadata"
                  className="h-8 w-full max-w-[200px]"
                  style={{ filter: isOwn && !isOpinion ? 'invert(1) brightness(2)' : undefined }}
                  src={signedAudioUrl ?? undefined}
                />
              </div>
              {transcript ? (
                <p className={`text-xs leading-relaxed italic ${isBotMessage && !isOwn ? 'text-black/70' : isOwn && !isOpinion ? 'text-white/80' : 'text-foreground/70'}`}>
                  {transcript}
                </p>
              ) : (
                <div className={`flex items-center gap-1 text-xs ${isOwn && !isOpinion ? 'text-white/60' : 'text-muted-foreground'}`}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Transcribing...</span>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-sm leading-relaxed ${isBotMessage && !isOwn ? 'text-black' : isOwn && !isOpinion ? 'text-white' : 'text-foreground'}`}>
              {content}
            </p>
          )}
        </motion.div>

        {/* Reactions display */}
        {iSeenYouCount > 0 && (
          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px]">
              <Eye className="w-3 h-3" />
              {iSeenYouCount > 1 && <span>{iSeenYouCount}</span>}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* Action menu (hover/long-press on other's messages) */}
        {showActions && !isOwn && !isOpinion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-0 left-0 flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg px-1 py-0.5 z-10"
            onMouseEnter={showMenu}
            onMouseLeave={hideMenu}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onReaction?.('i_see_you'); setShowActions(false); }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${hasISeenYou ? 'text-accent' : 'text-muted-foreground'}`}
              title="I see you"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={(e) => { e.stopPropagation(); onReply?.(); setShowActions(false); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
