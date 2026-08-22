import cosmosBg from '@/assets/tt-cosmos-bg.jpg';
import type { TTBackgroundStyle } from '@/hooks/useBackgroundPref';

interface TTBackgroundProps {
  /** Hue rotation 0-360 to differentiate topics. Default 0. */
  hue?: number;
  className?: string;
  /** Width of the TT phone viewport. Falls back to container width. */
  viewportWidth?: number;
  /** Artwork variant: classic eye or cosmic mandala. */
  variant?: TTBackgroundStyle;
}

/**
 * Deterministic faint star field for the cosmos variant.
 * Only outside r≈310 so the graph itself stays perfectly readable.
 */
const COSMOS_STARS: { x: number; y: number; r: number; o: number }[] = (() => {
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let guard = 0;
  while (out.length < 150 && guard++ < 4000) {
    const x = rnd() * 1000;
    const y = rnd() * 1000;
    if (Math.hypot(x - 500, y - 500) < 315) continue;
    const bright = rnd();
    out.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: bright > 0.94 ? 1.6 : 0.6 + rnd() * 0.7,
      o: bright > 0.94 ? 0.34 : 0.06 + rnd() * 0.2,
    });
  }
  return out;
})();

/**
 * Concentric background for the TT mobile UI.
 *
 * Sized so the blue ring (r=300 in a 1000-unit viewBox → 60% of width) spans
 * exactly the TT phone viewport width. On desktop this must use the centered
 * mobile shell width, not the browser's global viewport width.
 */

export function TTBackground({ hue = 0, className, viewportWidth, variant = 'eye' }: TTBackgroundProps) {

  const backgroundSize = viewportWidth && viewportWidth > 0
    ? `${viewportWidth / 0.6}px`
    : 'calc(100% / 0.6)';

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: backgroundSize,
        height: backgroundSize,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        filter: hue ? `hue-rotate(${hue}deg)` : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Dark faded-blue field behind everything */}
          <linearGradient id="tt-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#171d3a" />
            <stop offset="55%" stopColor="#151c37" />
            <stop offset="100%" stopColor="#141b35" />
          </linearGradient>

          <filter id="tt-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.06" />
            </feComponentTransfer>
          </filter>

          {/* Iris: deep navy through electric blue; light blue is confined to
              the narrow outer band where zero-point nodes sit. */}
          <radialGradient id="tt-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#081733" />
            <stop offset="48%" stopColor="#0b234c" />
            <stop offset="70%" stopColor="#10448f" />
            <stop offset="86%" stopColor="#1678dc" />
            <stop offset="92%" stopColor="#249dff" />
            <stop offset="96%" stopColor="#78caff" />
            <stop offset="100%" stopColor="#bde8ff" />
          </radialGradient>

          {/* Compact dark-orange pupil with a restrained amber rim. */}
          <radialGradient id="tt-pupil" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5f2305" />
            <stop offset="58%" stopColor="#773007" />
            <stop offset="86%" stopColor="#96420d" />
            <stop offset="100%" stopColor="#b65b1a" />
          </radialGradient>
          {/* Cosmos fallback field (used if the artwork fails to load). */}
          <radialGradient id="tt-cosmos-field" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1330" />
            <stop offset="55%" stopColor="#060c20" />
            <stop offset="100%" stopColor="#03060f" />
          </radialGradient>

          {/* Warm halo around the amber core. */}
          <radialGradient id="tt-cosmos-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#e8801d" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e8801d" stopOpacity="0" />
          </radialGradient>
        </defs>

        {variant === 'cosmos' ? (
          <>
            {/* Deep space field + artwork scaled so the filament ring lands on r=300 */}
            <rect width="1000" height="1000" fill="url(#tt-cosmos-field)" />

            <image
              href={cosmosBg}
              x="45"
              y="45"
              width="910"
              height="910"
              preserveAspectRatio="xMidYMid slice"
              opacity="0.95"
            />
            <rect width="1000" height="1000" filter="url(#tt-grain)" opacity="0.18" />

            {/* A hint of night sky — drawn on top of the artwork so it stays visible */}
            <g pointerEvents="none">
              {COSMOS_STARS.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dbe9ff" fillOpacity={s.o} />
              ))}
            </g>

            {/* Single zero-point ring as the only orientation line outside the graph */}
            <circle cx="500" cy="500" r="300" fill="none" stroke="#8ecbff" strokeOpacity="0.28" strokeWidth="1.5" />


            {/* Core glow aligned with the graph's core landmark */}
            <circle cx="500" cy="500" r="170" fill="url(#tt-cosmos-core)" />
          </>
        ) : (

          <>
            {/* Background gradient + grain */}
            <rect width="1000" height="1000" fill="url(#tt-bg)" />
            <rect width="1000" height="1000" filter="url(#tt-grain)" opacity="0.25" />

            {/* Broad white sclera from r=300 to r=360. */}
            <circle cx="500" cy="500" r="360" fill="#f7f5f0" />

            {/* Iris ends at the zero-point radius. No blur may bleed into sclera. */}
            <circle cx="500" cy="500" r="300" fill="url(#tt-iris)" />

            {/* Pupil aligns with the graph's core landmark. */}
            <circle cx="500" cy="500" r="140" fill="url(#tt-pupil)" />
          </>
        )}
      </svg>

    </div>
  );
}
