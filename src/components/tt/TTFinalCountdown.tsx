import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WINDOW_MS = 24 * 60 * 60 * 1000;

function format(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} Std ${String(m).padStart(2, '0')} Min`;
  if (m > 0) return `${m} Min ${String(s).padStart(2, '0')} Sek`;
  return `${s} Sek`;
}

/**
 * Slim "final day" countdown pill, shown in the free band between the topic
 * question and the graph during the last 24 hours before the discussion ends.
 * Purely presentational — it never blocks interaction with the graph.
 */
export function TTFinalCountdown({ endAt }: { endAt?: Date | null }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!endAt) return null;
  const msLeft = endAt.getTime() - now;
  const active = msLeft > 0 && msLeft <= WINDOW_MS;
  const urgent = msLeft <= 2 * 60 * 60 * 1000;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4"
          style={{ top: 114 }}
        >
          <div
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] leading-none backdrop-blur-md ${
              urgent
                ? 'border-destructive/50 bg-destructive/15 text-destructive'
                : 'border-border/40 bg-background/80 text-foreground/80'
            }`}
          >
            <Hourglass className={`h-3 w-3 shrink-0 ${urgent ? 'animate-pulse' : ''}`} />
            <span className="truncate">
              {t('tt.finalCountdown', 'Endspurt')}: {format(msLeft)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
