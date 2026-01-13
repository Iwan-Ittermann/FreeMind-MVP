import { motion } from 'framer-motion';

interface VerticalRatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  color: 'rose' | 'orange';
  lowLabel: string;
  highLabel: string;
}

export function VerticalRatingSlider({
  value,
  onChange,
  label,
  color,
  lowLabel,
  highLabel,
}: VerticalRatingSliderProps) {
  const colorClasses = {
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-400',
      track: 'bg-rose-400/20',
    },
    orange: {
      text: 'text-orange-400',
      bg: 'bg-orange-400',
      track: 'bg-orange-400/20',
    },
  };

  const colors = colorClasses[color];

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

  return (
    <div className="flex flex-col items-center h-full gap-3">
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

      {/* Value */}
      <span className={`text-xs font-mono ${colors.text}`}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}