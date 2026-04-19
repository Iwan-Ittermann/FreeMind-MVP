import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TTSideTabsProps {
  opinionsContent?: React.ReactNode;
  chatsContent?: React.ReactNode;
}

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 };

export function TTSideTabs({ opinionsContent, chatsContent }: TTSideTabsProps) {
  const { t } = useTranslation();
  const [side, setSide] = useState<'left' | 'right' | null>(null);

  return (
    <>
      {/* Left tab — top third */}
      <button
        onClick={() => setSide(side === 'left' ? null : 'left')}
        className="absolute left-0 top-[22%] z-30 h-28 w-7 rounded-r-xl bg-background/85 backdrop-blur-md border border-l-0 border-border/40 shadow-md flex items-center justify-center hover:bg-background/95 transition-colors"
        aria-label={t('tt.opinions')}
      >
        <span
          className="text-[10px] tracking-[0.2em] font-semibold text-foreground/80 uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t('tt.opinions')}
        </span>
      </button>

      {/* Right tab — bottom third */}
      <button
        onClick={() => setSide(side === 'right' ? null : 'right')}
        className="absolute right-0 bottom-[28%] z-30 h-28 w-7 rounded-l-xl bg-background/85 backdrop-blur-md border border-r-0 border-border/40 shadow-md flex items-center justify-center hover:bg-background/95 transition-colors"
        aria-label={t('tt.chats')}
      >
        <span
          className="text-[10px] tracking-[0.2em] font-semibold text-foreground/80 uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          {t('tt.chats')}
        </span>
      </button>

      {/* Backdrop + animated panels */}
      <AnimatePresence>
        {side && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSide(null)}
              className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[2px]"
            />

            {side === 'left' && (
              <motion.div
                key="panel-left"
                initial={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                transition={SPRING}
                style={{ transformOrigin: '0% 50%', top: '22%', height: '60vh', maxHeight: 520 }}
                className="absolute left-7 z-30 w-[78vw] max-w-[360px] rounded-2xl bg-background/85 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                    {t('tt.opinions')}
                  </h2>
                  <button
                    onClick={() => setSide(null)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label={t('common.close')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {opinionsContent ?? (
                    <p className="text-sm text-muted-foreground">{t('tt.opinionsEmpty')}</p>
                  )}
                </div>
              </motion.div>
            )}

            {side === 'right' && (
              <motion.div
                key="panel-right"
                initial={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                transition={SPRING}
                style={{ transformOrigin: '100% 50%', bottom: '28%', height: '60vh', maxHeight: 520 }}
                className="absolute right-7 z-30 w-[78vw] max-w-[360px] rounded-2xl bg-background/85 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                    {t('tt.chats')}
                  </h2>
                  <button
                    onClick={() => setSide(null)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label={t('common.close')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {chatsContent ?? (
                    <p className="text-sm text-muted-foreground">{t('tt.chatsEmpty')}</p>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
