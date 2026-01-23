import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  // For empathy: min=-50, max=50. For disagreement: min=0, max=100
  min?: number;
  max?: number;
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
  min = 0,
  max = 100,
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
  const range = max - min;

  // Convert value to percentage for visual positioning (0-100%)
  const percentage = ((value - min) / range) * 100;

  // Display value as integer
  const displayValue = Math.round(value);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = 1 - (y / rect.height);
    const newValue = min + pct * range;
    onChange(Math.max(min, Math.min(max, Math.round(newValue))));
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleClick(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const y = touch.clientY - rect.top;
    const pct = 1 - (y / rect.height);
    const newValue = min + pct * range;
    onChange(Math.max(min, Math.min(max, Math.round(newValue))));
  };

  // Calculate zero marker position (only show if 0 is within range)
  const showZeroMarker = min < 0 && max > 0;
  const zeroPosition = showZeroMarker ? ((0 - min) / range) * 100 : null;

  if (compact) {
    return (
      <div className="flex flex-col items-center h-full gap-1">

        {/* Slider track - increased width for better touch targets */}
        <div
          className="relative w-3 flex-1 rounded-full bg-white/10 cursor-pointer touch-none"
          onClick={handleClick}
          onMouseMove={handleDrag}
          onTouchMove={handleTouchMove}
        >
          {/* Zero marker */}
          {showZeroMarker && zeroPosition !== null && (
            <div
              className="absolute left-1/2 -translate-x-1/2 w-5 h-0.5 bg-white/40 z-10"
              style={{ bottom: `${zeroPosition}%` }}
            />
          )}
          
          {/* Fill - from zero for empathy, from bottom for disagreement */}
          {min < 0 ? (
            // Empathy: fill from zero point
            <motion.div
              className={`absolute left-0 right-0 rounded-full ${colors.bg}`}
              initial={false}
              animate={{
                bottom: value >= 0 ? `${zeroPosition}%` : `${percentage}%`,
                height: value >= 0 
                  ? `${percentage - zeroPosition!}%` 
                  : `${zeroPosition! - percentage}%`,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          ) : (
            // Disagreement: fill from bottom
            <motion.div
              className={`absolute bottom-0 left-0 right-0 rounded-full ${colors.bg}`}
              initial={false}
              animate={{ height: `${percentage}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          
          {/* Thumb - larger for better touch targets */}
          <motion.div
            className={`absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${colors.bg} shadow-lg border-2 border-black`}
            initial={false}
            animate={{ bottom: `calc(${percentage}% - 10px)` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Points value */}
        <span className={`text-xs font-mono font-bold ${colors.text}`}>
          {displayValue}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full gap-2">
      
      {/* High label */}
      <span className="text-[9px] text-white/30">{highLabel}</span>

      {/* Slider track */}
      <div
        className="relative w-2 flex-1 rounded-full bg-white/10 cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleDrag}
      >
        {/* Zero marker */}
        {showZeroMarker && zeroPosition !== null && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center" style={{ bottom: `${zeroPosition}%` }}>
            <div className="w-4 h-0.5 bg-white/50" />
            <span className="text-[8px] text-white/50 ml-1">0</span>
          </div>
        )}
        
        {/* Fill - from zero for empathy, from bottom for disagreement */}
        {min < 0 ? (
          // Empathy: fill from zero point
          <motion.div
            className={`absolute left-0 right-0 rounded-full ${colors.bg}`}
            initial={false}
            animate={{
              bottom: value >= 0 ? `${zeroPosition}%` : `${percentage}%`,
              height: value >= 0 
                ? `${percentage - zeroPosition!}%` 
                : `${zeroPosition! - percentage}%`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        ) : (
          // Disagreement: fill from bottom
          <motion.div
            className={`absolute bottom-0 left-0 right-0 rounded-full ${colors.bg}`}
            initial={false}
            animate={{ height: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        
        {/* Thumb */}
        <motion.div
          className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${colors.bg} shadow-lg border-2 border-black`}
          initial={false}
          animate={{ bottom: `calc(${percentage}% - 8px)` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Low label */}
      <span className="text-[9px] text-white/30">{lowLabel}</span>

      {/* Points value */}
      <span className={`text-sm font-mono font-bold ${colors.text}`}>
        {displayValue}
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
