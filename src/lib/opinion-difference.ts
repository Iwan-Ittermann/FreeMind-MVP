import { CheckCheck, Check, Minus, X, XCircle } from 'lucide-react';

export const OPINION_DIFFERENCE_STEPS = [
  { value: 0, key: 'tt.diffStep.strongAgree', Icon: CheckCheck, tone: 'agree' },
  { value: 2, key: 'tt.diffStep.agree', Icon: Check, tone: 'agree' },
  { value: 5, key: 'tt.diffStep.neutral', Icon: Minus, tone: 'neutral' },
  { value: 8, key: 'tt.diffStep.disagree', Icon: X, tone: 'disagree' },
  { value: 10, key: 'tt.diffStep.strongDisagree', Icon: XCircle, tone: 'disagree' },
] as const;

export function opinionDifferenceIndex(value: number): number {
  let best = 0;
  OPINION_DIFFERENCE_STEPS.forEach((step, index) => {
    if (Math.abs(step.value - value) < Math.abs(OPINION_DIFFERENCE_STEPS[best].value - value)) best = index;
  });
  return best;
}