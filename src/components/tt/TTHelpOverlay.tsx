import { useEffect, useState } from 'react';
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

interface RawCallout {
  rect: DOMRect;
  label: string;
  preferredSide: CalloutSide;
  isCircle?: boolean;
}

interface PositionedCallout extends RawCallout {
  ring: { x: number; y: number; w: number; h: number };
  labelBox: { x: number; y: number; w: number; h: number } | null;
}

function getFrameRect(): DOMRect {
  const el = document.querySelector('[data-tt-phone-frame]') as HTMLElement | null;
  if (el) return el.getBoundingClientRect();
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Rough label size estimate based on text length. */
function estimateLabel(text: string): { w: number; h: number } {
  const maxW = 160;
  const charW = 6.2;
  const lineH = 14;
  const padX = 16;
  const padY = 10;
  const approxLine = maxW - padX;
  const totalTextW = text.length * charW;
  const lines = Math.max(1, Math.ceil(totalTextW / approxLine));
  const w = Math.min(maxW, Math.max(40, totalTextW + padX));
  const h = lines * lineH + padY;
  return { w, h };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap = 4,
) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

export function TTHelpOverlay({ onClose, opinions, ownOpinionId }: TTHelpOverlayProps) {
  const { t } = useTranslation();

  // Pick a single random opinion id once for the lifetime of this overlay instance.
  const [randomOpinionIds] = useState<string[]>(() => {
    const others = opinions.filter((o) => o.id !== ownOpinionId);
    return pickRandom(others, 1).map((o) => o.id);
  });

  const [positioned, setPositioned] = useState<PositionedCallout[]>([]);

  useEffect(() => {
    const measure = () => {
      const raw: RawCallout[] = [];
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
        raw.push({ rect, label, preferredSide: side, isCircle });
      };

      push('[data-tt-help="opinions-tab"]', t('tt.help.opinionsList', 'Liste aller Meinungen'), 'top');
      push('[data-tt-help="chats-tab"]', t('tt.help.chatsList', 'Liste deiner Chats'), 'top');
      push('[data-tt-help="settings"]', t('tt.help.settings', 'Einstellungen & Anleitung'), 'top');

      randomOpinionIds.forEach((id) => {
        const el = document.querySelector(`[data-tt-node-id="${id}"]`) as SVGElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        raw.push({
          rect,
          label: t('tt.help.otherOpinions', 'Meinungen der anderen'),
          preferredSide: 'top',
          isCircle: true,
        });
      });

      if (ownOpinionId) {
        const el = document.querySelector(`[data-tt-node-id="${ownOpinionId}"]`) as SVGElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            raw.push({ rect, label: t('tt.help.yourOpinion', 'Deine Meinung'), preferredSide: 'top', isCircle: true });
          }
        }
      }

      // Now compute ring + label boxes with collision handling.
      const pad = 8;
      const gap = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 6;

      const placed: PositionedCallout[] = [];

      for (const c of raw) {
        const ring = {
          x: c.rect.left - pad,
          y: c.rect.top - pad,
          w: c.rect.width + pad * 2,
          h: c.rect.height + pad * 2,
        };

        let labelBox: { x: number; y: number; w: number; h: number } | null = null;

        if (c.label) {
          const size = estimateLabel(c.label);
          const candidates: Array<{ side: CalloutSide; x: number; y: number }> = [
            { side: c.preferredSide, x: 0, y: 0 },
            { side: 'right', x: 0, y: 0 },
            { side: 'left', x: 0, y: 0 },
            { side: 'bottom', x: 0, y: 0 },
            { side: 'top', x: 0, y: 0 },
          ];
          // dedupe by side
          const seen = new Set<string>();
          const uniq = candidates.filter((cd) => {
            if (seen.has(cd.side)) return false;
            seen.add(cd.side);
            return true;
          });

          const computePos = (side: CalloutSide) => {
            if (side === 'right') return { x: ring.x + ring.w + gap, y: ring.y + ring.h / 2 - size.h / 2 };
            if (side === 'left') return { x: ring.x - gap - size.w, y: ring.y + ring.h / 2 - size.h / 2 };
            if (side === 'bottom') return { x: ring.x + ring.w / 2 - size.w / 2, y: ring.y + ring.h + gap };
            return { x: ring.x + ring.w / 2 - size.w / 2, y: ring.y - gap - size.h };
          };

          let chosen: { x: number; y: number; w: number; h: number } | null = null;
          for (const cd of uniq) {
            let p = computePos(cd.side);
            // clamp to viewport
            p.x = Math.max(margin, Math.min(vw - size.w - margin, p.x));
            p.y = Math.max(margin, Math.min(vh - size.h - margin, p.y));
            const box = { x: p.x, y: p.y, w: size.w, h: size.h };
            const collides = placed.some(
              (o) =>
                rectsOverlap(box, o.ring, 2) ||
                (o.labelBox && rectsOverlap(box, o.labelBox, 2)),
            ) || rectsOverlap(box, ring, 2);
            if (!collides) {
              chosen = box;
              break;
            }
            if (!chosen) chosen = box; // fallback keep first
          }

          // Nudge downward if still overlapping something
          if (chosen) {
            let attempts = 0;
            while (
              attempts < 20 &&
              placed.some(
                (o) =>
                  rectsOverlap(chosen!, o.ring, 2) ||
                  (o.labelBox && rectsOverlap(chosen!, o.labelBox, 2)),
              )
            ) {
              chosen.y += size.h + 6;
              if (chosen.y + size.h > vh - margin) {
                chosen.y = margin;
                chosen.x += 20;
              }
              chosen.x = Math.max(margin, Math.min(vw - size.w - margin, chosen.x));
              chosen.y = Math.max(margin, Math.min(vh - size.h - margin, chosen.y));
              attempts++;
            }
          }

          labelBox = chosen;
        }

        placed.push({ ...c, ring, labelBox });
      }

      setPositioned(placed);
    };

    const id = requestAnimationFrame(() => {
      // Slight delay so animated nodes settle
      setTimeout(measure, 60);
    });
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
      {/* Dim backdrop (no blur) */}
      <div
        className="absolute inset-0 bg-background/70"
        onClick={onClose}
      />

      {/* Close — top left */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-background/90 border border-border/40 flex items-center justify-center text-foreground hover:bg-background"
        aria-label={t('common.close', 'Close')}
      >
        <X className="w-4 h-4" />
      </button>

      {positioned.map((c, i) => (
        <div key={i} className="pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i }}
            className="absolute border-2 border-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]"
            style={{
              left: c.ring.x,
              top: c.ring.y,
              width: c.ring.w,
              height: c.ring.h,
              borderRadius: c.isCircle ? '9999px' : '12px',
            }}
          />
          {c.label && c.labelBox && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i + 0.1 }}
              className="absolute text-[11px] leading-tight font-medium text-foreground bg-background/95 border border-primary/40 rounded-md px-2 py-1 shadow-md whitespace-normal"
              style={{
                left: c.labelBox.x,
                top: c.labelBox.y,
                width: c.labelBox.w,
              }}
            >
              {c.label}
            </motion.div>
          )}
        </div>
      ))}
    </motion.div>
  );

  return createPortal(<AnimatePresence>{overlay}</AnimatePresence>, document.body);
}
