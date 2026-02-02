import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, GraduationCap, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface FloatingHelpButtonProps {
  onStartTutorial: () => void;
  onOpenVideo: () => void;
}

export function FloatingHelpButton({ onStartTutorial, onOpenVideo }: FloatingHelpButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  const handleTutorialClick = () => {
    setIsExpanded(false);
    onStartTutorial();
  };

  const handleVideoClick = () => {
    setIsExpanded(false);
    onOpenVideo();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3">
      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center",
          "bg-primary text-primary-foreground shadow-lg",
          "hover:bg-primary/90 transition-colors",
          "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
          "focus:outline-none focus-visible:ring-primary"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isExpanded ? t('help.closeHelp') : 'Help'}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="help"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <HelpCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Expanded menu options */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Tutorial button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }}
              onClick={handleTutorialClick}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-full",
                "bg-card border border-border text-foreground shadow-lg",
                "hover:bg-accent transition-colors",
                "text-sm font-medium whitespace-nowrap"
              )}
            >
              <GraduationCap className="w-5 h-5" />
              <span>{t('help.startTutorial')}</span>
            </motion.button>

            {/* Video button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0 }}
              onClick={handleVideoClick}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-full",
                "bg-card border border-border text-foreground shadow-lg",
                "hover:bg-accent transition-colors",
                "text-sm font-medium whitespace-nowrap"
              )}
            >
              <Play className="w-5 h-5" />
              <span>{t('help.watchVideo')}</span>
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
