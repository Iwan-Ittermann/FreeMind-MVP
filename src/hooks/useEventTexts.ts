import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Independent text tokens per context; each context has its own admin panel. */
export type EventTextScope = 'main' | 'wedium' | 'gutefrage';

export const EVENT_TEXT_KEYS: Record<EventTextScope, string[]> = {
  main: ['main_question_de', 'main_question_en', 'main_date_de', 'main_date_en'],
  wedium: ['wedium_question_de', 'wedium_question_en', 'wedium_date_de', 'wedium_date_en'],
  gutefrage: ['gutefrage_question', 'gutefrage_event_date'],
};

export function useEventTexts(scope: EventTextScope, lang: 'de' | 'en') {
  const { data } = useQuery({
    queryKey: ['eventTexts', scope],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('key, value').in('key', EVENT_TEXT_KEYS[scope]);
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value.trim()])) as Record<string, string>;
    },
    staleTime: 60_000,
  });
  const v = data ?? {};
  if (scope === 'gutefrage') return { question: v.gutefrage_question || '', date: v.gutefrage_event_date || '', loaded: !!data };
  const pick = (base: string) => v[`${scope}_${base}_${lang}`] || v[`${scope}_${base}_de`] || '';
  return { question: pick('question'), date: pick('date'), loaded: !!data };
}
