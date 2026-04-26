import { GraduationCap } from 'lucide-react';

interface StartTourButtonProps {
  onStart?: () => void;
}

export function StartTourButton({ onStart }: StartTourButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onStart?.();
        window.dispatchEvent(new CustomEvent('freemind:onboarding-start'));
      }}
      className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-foreground/85 transition-colors hover:bg-muted"
    >
      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
      <span>Tour neu starten</span>
    </button>
  );
}
