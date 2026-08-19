import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TutorialHighlight = 'none' | 'difference' | 'chat';

export interface TutorialStep {
  id: string;
  text: string;
  highlight: TutorialHighlight;
}

/** Fallback used when the admin table is empty (tour must never break). */
const FALLBACK_STEPS: TutorialStep[] = [
  {
    id: 'fallback-1',
    text: 'Klick auf die anderen Meinungen und bewerte deine Zustimmung oder Ablehnung!',
    highlight: 'difference',
  },
  {
    id: 'fallback-2',
    text: 'Jetzt kannst du mit ihnen chatten. Klick auf "Diskutieren"',
    highlight: 'chat',
  },
];

/** Admin-editable onboarding tour steps, ordered. */
export function useTutorialSteps() {
  const { data } = useQuery({
    queryKey: ['tutorialSteps'],
    queryFn: async (): Promise<TutorialStep[]> => {
      const { data, error } = await supabase
        .from('tutorial_steps')
        .select('id, text, highlight, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        text: row.text,
        highlight: (row.highlight as TutorialHighlight) ?? 'none',
      }));
    },
    staleTime: 60_000,
  });

  const steps = data && data.length > 0 ? data : FALLBACK_STEPS;
  return { steps, totalSteps: steps.length };
}
