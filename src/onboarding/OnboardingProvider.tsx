import { useCallback, useEffect, useMemo, useState } from 'react';
import { Joyride, type Step } from 'react-joyride';
import { useOnboardingTour } from './useOnboardingTour';

type PulseRect = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

interface OnboardingProviderProps {
  onRevealOpinion?: () => void;
  onOpenChat?: () => void;
}

function getRects(selectors: string[] = []): PulseRect[] {
  const rects: PulseRect[] = [];
  selectors.forEach((selector) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    rects.push({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  });
  return rects;
}

export default function OnboardingProvider({ onRevealOpinion, onOpenChat }: OnboardingProviderProps) {
  const [pulseRects, setPulseRects] = useState<PulseRect[]>([]);

  const prepareStep = useCallback((step: Step) => {
    const prepare = (step as Step & { data?: { prepare?: string } }).data?.prepare;
    if (prepare === 'select-opinion') onRevealOpinion?.();
    if (prepare === 'open-chat') {
      onRevealOpinion?.();
      window.setTimeout(() => onOpenChat?.(), 120);
    }
  }, [onOpenChat, onRevealOpinion]);

  const tour = useOnboardingTour({ onPrepareStep: prepareStep });
  const activeStep = tour.steps[tour.stepIndex];
  const activeSelectors = useMemo(
    () => (activeStep as Step & { data?: { pulseSelectors?: string[] } } | undefined)?.data?.pulseSelectors ?? [],
    [activeStep],
  );

  useEffect(() => {
    const start = () => tour.startTour();
    window.addEventListener('freemind:onboarding-start', start);
    return () => window.removeEventListener('freemind:onboarding-start', start);
  }, [tour]);

  useEffect(() => {
    if (!tour.run) {
      setPulseRects([]);
      return;
    }

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setPulseRects(getRects(activeSelectors)));
    };

    update();
    const delayed = window.setTimeout(update, 180);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(delayed);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [activeSelectors, tour.run, tour.stepIndex]);

  return (
    <>
      <Joyride
        steps={tour.steps}
        run={tour.run}
        stepIndex={tour.stepIndex}
        callback={tour.handleJoyrideCallback}
        continuous
        showSkipButton
        showProgress={false}
        spotlightClicks
        disableScrolling
        disableOverlayClose={false}
        hideCloseButton={false}
        scrollOffset={96}
        options={{
          zIndex: 80,
          arrowColor: 'hsl(var(--background) / 0.94)',
          backgroundColor: 'hsl(var(--background) / 0.9)',
          overlayColor: 'hsl(var(--foreground) / 0.18)',
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          width: 330,
        }}
        locale={{ back: 'Zurück', close: 'Schließen', last: "Let's go!", next: 'Weiter', skip: 'Überspringen' }}
        styles={{
          tooltip: {
            borderRadius: 20,
            border: '1px solid hsl(var(--border) / 0.55)',
            boxShadow: '0 24px 70px hsl(var(--foreground) / 0.22)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          },
          tooltipTitle: {
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 0,
          },
          tooltipContent: {
            fontSize: 14,
            lineHeight: 1.55,
            padding: '10px 18px 14px',
            whiteSpace: 'pre-line',
          },
          buttonPrimary: {
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            padding: '9px 14px',
          },
          buttonBack: {
            color: 'hsl(var(--muted-foreground))',
            fontSize: 12,
            marginRight: 8,
          },
          buttonSkip: {
            color: 'hsl(var(--muted-foreground))',
            fontSize: 12,
          },
        }}
      />

      {tour.run && pulseRects.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[79]" aria-hidden="true">
          {pulseRects.map((rect, index) => (
            <span
              key={`${rect.left}-${rect.top}-${index}`}
              className="absolute rounded-2xl border border-primary/70 shadow-[0_0_0_8px_hsl(var(--primary)/0.10)] animate-[freemind-tour-pulse_1.6s_ease-in-out_infinite]"
              style={{
                top: rect.top - 8,
                left: rect.left - 8,
                width: rect.width + 16,
                height: rect.height + 16,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
