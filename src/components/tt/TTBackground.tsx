interface TTBackgroundProps {
  /** Hue rotation 0-360 to differentiate topics. Default 0. */
  hue?: number;
  className?: string;
  /** Width of the TT phone viewport. Falls back to container width. */
  viewportWidth?: number;
}

/**
 * Concentric background for the TT mobile UI.
 *
 * Sized so the blue ring (r=300 in a 1000-unit viewBox → 60% of width) spans
 * exactly the TT phone viewport width. On desktop this must use the centered
 * mobile shell width, not the browser's global viewport width.
 */
export function TTBackground({ hue = 0, className, viewportWidth }: TTBackgroundProps) {
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

          {/* Full iris: warm pupil falloff -> deep navy -> electric blue -> light blue */}
          <radialGradient id="tt-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8a3a0a" />
            <stop offset="27%" stopColor="#b4581a" />
            <stop offset="33%" stopColor="#4a2c2e" />
            <stop offset="40%" stopColor="#0b1c3f" />
            <stop offset="55%" stopColor="#123566" />
            <stop offset="66%" stopColor="#1863c8" />
            <stop offset="78%" stopColor="#2a8fff" />
            <stop offset="90%" stopColor="#6fc4ff" />
            <stop offset="100%" stopColor="#b8e4ff" />
          </radialGradient>

          {/* Dark orange pupil */}
          <radialGradient id="tt-pupil" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7a3208" />
            <stop offset="70%" stopColor="#8f3f0c" />
            <stop offset="100%" stopColor="#b4581a" />
          </radialGradient>

          <filter id="tt-blur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Background gradient + grain */}
        <rect width="1000" height="1000" fill="url(#tt-bg)" />
        <rect width="1000" height="1000" filter="url(#tt-grain)" opacity="0.25" />

        {/* White ring — crisp boundary of the discussion field */}
        <circle cx="500" cy="500" r="352" fill="#f6f2ec" />

        {/* Iris */}
        <circle cx="500" cy="500" r="348" fill="url(#tt-iris)" filter="url(#tt-blur)" />

        {/* Dark orange pupil — drawn last, unblurred */}
        <circle cx="500" cy="500" r="100" fill="url(#tt-pupil)" />
      </svg>
    </div>
  );
}
