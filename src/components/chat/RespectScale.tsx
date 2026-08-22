import { useRef } from 'react';
import { motion } from 'framer-motion';

interface RespectScaleProps {
  /** Current value 0-100, or null when nothing has been picked yet. */
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  lowLabel: string;
  highLabel: string;
}

/**
 * Unicolor 0-100 bar for the understanding ("Verständnis") rating.
 * No default position: the thumb only appears once a value is set.
 */
export function RespectScale({ value, onChange, disabled, lowLabel, highLabel }: RespectScaleProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pick = (clientX: number) => {
    const el = trackRef.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const pct = (clientX - rect.left) / rect.width;
    onChange(Math.max(0, Math.min(100, Math.round(pct * 100))));
  };

  const pct = value ?? 0;

  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        tabIndex={disabled ? -1 : 0}
        className={`relative h-6 flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer touch-none'}`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          pick(e.clientX);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowRight') onChange(Math.min(100, (value ?? 0) + 5));
          if (e.key === 'ArrowLeft') onChange(Math.max(0, (value ?? 0) - 5));
        }}
      >
        <div className="h-[3px] w-full rounded-full bg-foreground/20">
          {value != null && (
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
        </div>
        {value != null && (
          <motion.div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow"
            initial={false}
            animate={{ left: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}
      </div>

      <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>{lowLabel}</span>
        <span className="tabular-nums text-foreground/70">{value != null ? value : '–'}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
