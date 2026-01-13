import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface VerticalRatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  color: 'rose' | 'orange';
  lowLabel: string;
  highLabel: string;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  compact?: boolean;
}

export function VerticalRatingSlider({
  value,
  onChange,
  label,
  color,
  lowLabel,
  highLabel,
  hasUnsavedChanges = false,
  onSave,
  isSaving = false,
  compact = false,
}: VerticalRatingSliderProps) {
  const colorClasses = {
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-400',
      track: 'bg-rose-400/20',
      saveButton: 'bg-rose-500 hover:bg-rose-600',
      unsavedRing: 'ring-rose-400',
    },
    orange: {
      text: 'text-orange-400',
      bg: 'bg-orange-400',
      track: 'bg-orange-400/20',
      saveButton: 'bg-orange-500 hover:bg-orange-600',
      unsavedRing: 'ring-orange-400',
    },
  };

  const colors = colorClasses[color];

  // Convert 0-1 to 0-100 points
  const points = Math.round(value * 100);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = 1 - (y / rect.height);
    onChange(Math.max(0, Math.min(1, percentage)));
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleClick(e);
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center h-full gap-1">
        {/* Label */}
        <span className={`text-[8px] font-medium uppercase tracking-wider ${colors.text}`}>
          {label}
        </span>

        {/* Slider track */}
        <div
          className={`relative w-1.5 flex-1 rounded-full ${colors.track} cursor-pointer`}
          onClick={handleClick}
          onMouseMove={handleDrag}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const y = touch.clientY - rect.top;
            const percentage = 1 - (y / rect.height);
            onChange(Math.max(0, Math.min(1, percentage)));
          }}
        >
          {/* Fill */}
          <motion.div
            className={`absolute bottom-0 left-0 right-0 rounded-full ${colors.bg}`}
            initial={false}
            animate={{ height: `${value * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          
          {/* Thumb */}
          <motion.div
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${colors.bg} shadow-lg border border-black`}
            initial={false}
            animate={{ bottom: `calc(${value * 100}% - 6px)` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Points value */}
        <span className={`text-xs font-mono font-bold ${colors.text}`}>
          {points}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full gap-2">
      {/* Label */}
      <span className={`text-[10px] font-medium uppercase tracking-wider ${colors.text}`}>
        {label}
      </span>
      
      {/* High label */}
      <span className="text-[9px] text-white/30">{highLabel}</span>

      {/* Slider track */}
      <div
        className={`relative w-2 flex-1 rounded-full ${colors.track} cursor-pointer`}
        onClick={handleClick}
        onMouseMove={handleDrag}
      >
        {/* Fill */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 rounded-full ${colors.bg}`}
          initial={false}
          animate={{ height: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        
        {/* Thumb */}
        <motion.div
          className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${colors.bg} shadow-lg border-2 border-black`}
          initial={false}
          animate={{ bottom: `calc(${value * 100}% - 8px)` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Low label */}
      <span className="text-[9px] text-white/30">{lowLabel}</span>

      {/* Points value */}
      <span className={`text-sm font-mono font-bold ${colors.text}`}>
        {points}
      </span>

      {/* Save button - small circle */}
      {onSave && (
        <motion.button
          onClick={onSave}
          disabled={isSaving}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            hasUnsavedChanges 
              ? `${colors.saveButton} ring-2 ${colors.unsavedRing} ring-offset-2 ring-offset-black` 
              : 'bg-white/10 hover:bg-white/20'
          }`}
          whileTap={{ scale: 0.9 }}
          title={hasUnsavedChanges ? 'Save rating' : 'Rating saved'}
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className={`w-3.5 h-3.5 ${hasUnsavedChanges ? 'text-white' : 'text-white/40'}`} />
          )}
        </motion.button>
      )}
    </div>
  );
}
