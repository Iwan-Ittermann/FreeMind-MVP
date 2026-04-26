import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CallBackProps, Step, STATUS } from 'react-joyride';
import { FREEMIND_ONBOARDING_COMPLETED_KEY, ttOnboardingSteps } from './tt-onboarding-steps';

const FINISHED_STATUSES: string[] = ['finished', 'skipped'];

function hasCompletedTour() {
  try {
    return localStorage.getItem(FREEMIND_ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return true;
  }
}

interface UseOnboardingTourOptions {
  autoStart?: boolean;
  onPrepareStep?: (step: Step) => void;
}

export function useOnboardingTour({ autoStart = true, onPrepareStep }: UseOnboardingTourOptions = {}) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => ttOnboardingSteps, []);

  const completeTour = useCallback(() => {
    try {
      localStorage.setItem(FREEMIND_ONBOARDING_COMPLETED_KEY, 'true');
    } catch {
      // Ignore private-mode storage failures.
    }
    setRun(false);
  }, []);

  const startTour = useCallback(() => {
    try {
      localStorage.removeItem(FREEMIND_ONBOARDING_COMPLETED_KEY);
    } catch {
      // Ignore private-mode storage failures.
    }
    setStepIndex(0);
    setRun(true);
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  useEffect(() => {
    if (!autoStart || hasCompletedTour()) return;
    const id = window.setTimeout(() => setRun(true), 650);
    return () => window.clearTimeout(id);
  }, [autoStart]);

  useEffect(() => {
    if (!run) return;
    const step = steps[stepIndex];
    if (step) onPrepareStep?.(step);
  }, [onPrepareStep, run, stepIndex, steps]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (FINISHED_STATUSES.includes(status as STATUS)) {
      completeTour();
      return;
    }

    if (type === 'step:after' || type === 'error:target_not_found') {
      const nextIndex = index + (action === 'prev' ? -1 : 1);
      setStepIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
    }
  }, [completeTour, steps.length]);

  return {
    run,
    stepIndex,
    steps,
    startTour,
    skipTour,
    completeTour,
    handleJoyrideCallback,
  };
}
