interface TTBackgroundProps {
  /** Hue rotation 0-360 to differentiate topics. Default 0. */
  hue?: number;
  className?: string;
}

/**
 * Concentric background for the TT mobile UI.
 *
 * Sized so the blue ring (r=300 in a 1000-unit viewBox → 60% of width) spans
 * exactly the viewport width: SVG width = 100vw / 0.6 ≈ 166.67vw, square,
 * centered. The white ring + outer gradient/grain bleed off the top and
 * bottom intentionally.
 */
export function TTBackground({ hue = 0, className }: TTBackgroundProps) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 'calc(100vw / 0.6)',
        height: 'calc(100vw / 0.6)',
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
          <linearGradient id="tt-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e4d2bd" />
            <stop offset="100%" stopColor="#9fb6c4" />
          </linearGradient>

          <filter id="tt-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.06" />
            </feComponentTransfer>
          </filter>

          <radialGradient id="tt-inner" cx="60%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1f5c6b" />
            <stop offset="100%" stopColor="#0b2c3a" />
          </radialGradient>

          <filter id="tt-blur">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Background gradient + grain */}
        <rect width="1000" height="1000" fill="url(#tt-bg)" />
        <rect width="1000" height="1000" filter="url(#tt-grain)" opacity="0.25" />

        {/* White ring */}
        <circle cx="500" cy="500" r="360" fill="#f3efe9" />

        {/* Blurred teal circle */}
        <circle cx="500" cy="500" r="300" fill="url(#tt-inner)" filter="url(#tt-blur)" />

        {/* Dark core */}
        <circle cx="500" cy="500" r="140" fill="#071c26" />
      </svg>
    </div>
  );
}
