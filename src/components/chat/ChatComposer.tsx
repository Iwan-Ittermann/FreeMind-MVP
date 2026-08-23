import { useCallback, useEffect, useRef } from 'react';
import { Send, Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** Optional voice recording toggle — shown while the field is empty. */
  onVoiceToggle?: () => void;
  /** Called whenever the composer changes height (e.g. to keep the transcript pinned). */
  onHeightChange?: () => void;
}

const MAX_ROWS = 5;
const LINE_HEIGHT = 22;
const V_PADDING = 18;

/**
 * Messenger-style composer: auto-growing textarea (1–5 rows), 16px text to
 * avoid the iOS focus zoom, and Enter-to-send on desktop only.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  isSending = false,
  disabled = false,
  placeholder,
  maxLength = 1000,
  onVoiceToggle,
  onHeightChange,
}: ChatComposerProps) {
  const isMobile = useIsMobile();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const max = MAX_ROWS * LINE_HEIGHT + V_PADDING;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    onHeightChange?.();
  }, [onHeightChange]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    // Mobile keyboards: Enter inserts a newline, sending happens via the button.
    if (isMobile || e.shiftKey) return;
    e.preventDefault();
    onSend();
  };

  const hasText = value.trim().length > 0;
  const showCounter = value.length >= maxLength * 0.9;

  return (
    <div className="flex items-end gap-2">
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full resize-none rounded-2xl border border-border bg-background px-3.5 py-2 text-base leading-[22px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:opacity-60"
          style={{ minHeight: 40 }}
        />
        {showCounter && (
          <span className="pointer-events-none absolute bottom-1 right-3 text-[10px] tabular-nums text-muted-foreground">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {hasText || !onVoiceToggle ? (
        <Button
          onClick={onSend}
          disabled={isSending || disabled || !hasText}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      ) : (
        <Button
          onClick={onVoiceToggle}
          disabled={disabled}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
