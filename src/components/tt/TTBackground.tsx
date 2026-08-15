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
            <stop offset="0%" stopColor="#1b1c3c" />
            <stop offset="55%" stopColor="#16203f" />
            <stop offset="100%" stopColor="#101a33" />
          </linearGradient>

          {/* Bright blue halo ring */}
          <radialGradient id="tt-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3aa0ff" stopOpacity="0" />
            <stop offset="62%" stopColor="#2f8bff" stopOpacity="0.15" />
            <stop offset="84%" stopColor="#5cc0ff" stopOpacity="0.95" />
            <stop offset="94%" stopColor="#8fd8ff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#8fd8ff" stopOpacity="0" />
          </radialGradient>


          <filter id="tt-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.06" />
            </feComponentTransfer>
          </filter>

          {/* Warm multi-shade orange core */}
          <radialGradient id="tt-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5a63a" />
            <stop offset="22%" stopColor="#e2822a" />
            <stop offset="45%" stopColor="#b45a17" />
            <stop offset="70%" stopColor="#7c3a11" />
            <stop offset="100%" stopColor="#4a220c" />
          </radialGradient>

          {/* Dark inner core so the centre star pops */}
          <radialGradient id="tt-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a1405" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#3a1c08" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#5a2c0c" stopOpacity="0" />
          </radialGradient>

          <filter id="tt-blur">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="tt-halo-blur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Background gradient + grain */}
        <rect width="1000" height="1000" fill="url(#tt-bg)" />
        <rect width="1000" height="1000" filter="url(#tt-grain)" opacity="0.25" />

        {/* White ring — crisp boundary of the discussion field */}
        <circle cx="500" cy="500" r="352" fill="#f6f2ec" />

        {/* Bright blue halo just inside the white ring */}
        <circle cx="500" cy="500" r="348" fill="url(#tt-halo)" filter="url(#tt-halo-blur)" />

        {/* Warm orange core */}
        <circle cx="500" cy="500" r="285" fill="url(#tt-inner)" filter="url(#tt-blur)" />

        {/* Dark inner core */}
        <circle cx="500" cy="500" r="150" fill="url(#tt-core)" />
      </svg>
    </div>
  );
}
