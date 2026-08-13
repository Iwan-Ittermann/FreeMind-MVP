interface UnderstandingIconProps {
  className?: string;
}

/**
 * Line-art head in profile with a speech bubble + check mark inside —
 * the icon for the "understanding" rating ("Verständnis").
 */
export function UnderstandingIcon({ className }: UnderstandingIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Head in profile */}
      <path d="M30 44v-7h5a2 2 0 0 0 2-2v-6h4l-4.6-8.2A15 15 0 1 0 15 40.5V44" />
      {/* Speech bubble inside the head */}
      <path d="M15 14h13a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 28 26h-7l-4 4v-4h-2a2.5 2.5 0 0 1-2.5-2.5v-7A2.5 2.5 0 0 1 15 14Z" />
      {/* Check mark */}
      <path d="M17.5 20.2l2.8 2.8 5-5.4" />
    </svg>
  );
}
