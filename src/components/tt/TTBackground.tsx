interface TTBackgroundProps {
  /** Hue rotation 0-360 to differentiate topics. Default 0. */
  hue?: number;
  className?: string;
}

/**
 * Layered "iris" SVG background for the TikTok-style mobile UI.
 * Three concentric zones: dark core (Respectful), blurred mid-blue ring
 * (Moderate), warm cream gap, and outer pastel zone (Extreme).
 *
 * preserveAspectRatio="xMidYMid slice" guarantees full-bleed coverage in portrait.
 */
export function TTBackground({ hue = 0, className }: TTBackgroundProps) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        filter: hue ? `hue-rotate(${hue}deg)` : undefined,
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Zone 2 gradient (slightly off-center) */}
        <radialGradient id="tt-g2" cx="48%" cy="46%" r="52%">
          <stop offset="55%" stopColor="#12313f" />
          <stop offset="100%" stopColor="#2a5d73" />
        </radialGradient>

        {/* Outer (Zone 3 + 4) directional gradient */}
        <linearGradient id="tt-g34" x1="-10%" y1="-10%" x2="110%" y2="110%">
          <stop offset="0%" stopColor="#e4d2bd" />
          <stop offset="45%" stopColor="#b8cbd3" />
          <stop offset="100%" stopColor="#eef2f4" />
        </linearGradient>

        {/* Outer vignette for depth */}
        <radialGradient id="tt-vignette" cx="50%" cy="50%" r="60%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>

        {/* Masks: cut out inner zones from outer fills */}
        <mask id="tt-mask-z2">
          <rect width="100%" height="100%" fill="white" />
          <circle cx="500" cy="500" r="130" fill="black" />
        </mask>
        <mask id="tt-mask-gap">
          <rect width="100%" height="100%" fill="white" />
          <circle cx="500" cy="500" r="290" fill="black" />
        </mask>

        {/* Blur applied ONLY to the moderate ring */}
        <filter id="tt-blur-z2">
          <feGaussianBlur stdDeviation="8" />
        </filter>

        {/* Subtle film grain for outer zone */}
        <filter id="tt-noise-outer">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.025" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Outer (Zone 3 + 4) */}
      <g>
        <circle cx="500" cy="500" r="500" fill="url(#tt-g34)" />
        <circle cx="500" cy="500" r="500" filter="url(#tt-noise-outer)" opacity="0.08" />
      </g>

      {/* Warm cream gap — narrower (r=300) for subtler ring */}
      <g>
        <circle cx="500" cy="500" r="300" fill="#f4f1ec" mask="url(#tt-mask-gap)" />
      </g>

      {/* Zone 2 — moderate (blurred) */}
      <g>
        <circle cx="500" cy="500" r="290" fill="url(#tt-g2)" mask="url(#tt-mask-z2)" filter="url(#tt-blur-z2)" />
      </g>

      {/* Zone 1 — respectful core */}
      <g>
        <circle cx="500" cy="500" r="130" fill="#0c1f28" />
      </g>

      {/* Edge vignette (above all) */}
      <circle cx="500" cy="500" r="500" fill="url(#tt-vignette)" pointerEvents="none" />
    </svg>
  );
}
