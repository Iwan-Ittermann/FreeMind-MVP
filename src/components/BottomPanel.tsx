import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomPanelProps {
  open: boolean;
  children: ReactNode;
}

export function BottomPanel({ open, children }: BottomPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 right-0 bottom-14 z-[55] rounded-t-2xl bg-background/95 backdrop-blur-md border-t border-border/40 overflow-hidden flex flex-col md:hidden"
          style={{ height: '55vh' }}
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-2">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
