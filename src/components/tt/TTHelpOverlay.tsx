import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Opinion } from '@/types/graph';

interface TTHelpOverlayProps {
  onClose: () => void;
  opinions: Opinion[];
  ownOpinionId?: string | null;
}

type CalloutSide = 'top' | 'bottom' | 'left' | 'right';

interface Callout {
  rect: DOMRect;
  label: string;
  side: CalloutSide;
  isCircle?: boolean;
}

/**
 * Reads the phone-frame element that scopes the mobile UI in single-topic mode.
 * Falls back to the viewport if the frame isn't found.
 */
function getFrameRect(): DOMRect {
  const el = document.querySelector('[data-tt-phone-frame]') as HTMLElement | null;
  if (el) return el.getBoundingClientRect();
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

/**
 * Pick up to N random items deterministically-ish per open (shuffle once at mount).
 */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function TTHelpOverlay({ onClose, opinions, ownOpinionId }: TTHelpOverlayProps) {
  const { t } = useTranslation();
  const [callouts, setCallouts] = useState<Callout[]>([]);

  // Randomly pick up to 3 opinion nodes (excluding user's own) once.
  const randomOpinionIds = useMemo(() => {
    const others = opinions.filter((o) => o.id !== ownOpinionId);
    return pickRandom(others, 3).map((o) => o.id);
  }, [opinions, ownOpinionId]);

  useEffect(() => {
    const measure = () => {
      const list: Callout[] = [];

      const push = (
        selector: string,
        label: string,
        side: CalloutSide,
        isCircle = false,
      ) => {
        const el = document.querySelector(selector) as HTMLElement | SVGElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        list.push({ rect, label, side, isCircle });
      };

      push('[data-tt-help="opinions-tab"]', t('tt.help.opinionsList', 'Liste aller Meinungen'), 'right');
      push('[data-tt-help="chats-tab"]', t('tt.help.chatsList', 'Liste deiner Chats'), 'left');
      push('[data-tt-help="settings"]', t('tt.help.settings', 'Einstellungen & Anleitung'), 'bottom');

      // Random opinion nodes
      randomOpinionIds.forEach((id, idx) => {
        const el = document.querySelector(`[data-tt-node-id="${id}"]`) as SVGElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        list.push({
          rect,
          label: idx === 0 ? t('tt.help.otherOpinions', 'Meinungen der anderen') : '',
          side: 'right',
          isCircle: true,
        });
      });

      // User's own opinion node
      if (ownOpinionId) {
        const el = document.querySelector(`[data-tt-node-id="${ownOpinionId}"]`) as SVGElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            list.push({ rect, label: t('tt.help.yourOpinion', 'Deine Meinung'), side: 'right', isCircle: true });
          }
        }
      }

      // Zones — synthesize from the phone frame
      const frame = getFrameRect();
      const cx = frame.left + frame.width / 2;
      const cy = frame.top + frame.height / 2;
      // Respectful zone — near center
      const respR = frame.width * 0.20;
      list.push({
        rect: new DOMRect(cx - respR, cy - respR, respR * 2, respR * 2),
        label: t('tt.help.highScore', 'Hohe Punktzahl'),
        side: 'right',
        isCircle: true,
      });
      // Extreme zone — near outer edge (annotate at bottom of frame)
      const extR = frame.width * 0.48;
      list.push({
        rect: new DOMRect(cx - 30, cy + extR - 30, 60, 60),
        label: t('tt.help.negativeScore', 'Negative Punktzahl'),
        side: 'top',
        isCircle: true,
      });

      setCallouts(list);
    };

    // Measure after paint so DOM is settled
    const id = requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [t, randomOpinionIds, ownOpinionId]);

  const overlay = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200]"
    >
      {/* Dim backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-background/90 border border-border/40 flex items-center justify-center text-foreground hover:bg-background"
        aria-label={t('common.close', 'Close')}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.25em] text-foreground/70">
        {t('tt.help.title', 'So funktioniert es')}
      </div>

      {/* Spotlights + labels */}
      {callouts.map((c, i) => {
        const pad = 8;
        const x = c.rect.left - pad;
        const y = c.rect.top - pad;
        const w = c.rect.width + pad * 2;
        const h = c.rect.height + pad * 2;

        // Label position
        let labelStyle: React.CSSProperties = {};
        if (c.side === 'right') labelStyle = { left: x + w + 12, top: y + h / 2, transform: 'translateY(-50%)' };
        if (c.side === 'left') labelStyle = { left: x - 12, top: y + h / 2, transform: 'translate(-100%,-50%)' };
        if (c.side === 'bottom') labelStyle = { left: x + w / 2, top: y + h + 10, transform: 'translateX(-50%)' };
        if (c.side === 'top') labelStyle = { left: x + w / 2, top: y - 10, transform: 'translate(-50%,-100%)' };

        return (
          <div key={i} className="pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              className="absolute border-2 border-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]"
              style={{
                left: x,
                top: y,
                width: w,
                height: h,
                borderRadius: c.isCircle ? '9999px' : '12px',
              }}
            />
            {c.label && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.1 }}
                className="absolute max-w-[160px] text-[11px] leading-tight font-medium text-foreground bg-background/95 border border-primary/40 rounded-md px-2 py-1 shadow-md whitespace-normal"
                style={labelStyle}
              >
                {c.label}
              </motion.div>
            )}
          </div>
        );
      })}
    </motion.div>
  );

  return createPortal(<AnimatePresence>{overlay}</AnimatePresence>, document.body);
}
