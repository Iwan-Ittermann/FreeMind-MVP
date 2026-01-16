import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Law {
  id: string;
  lawBook: string;
  paragraph: string;
  offense: string;
  version: string;
  effectiveDate: Date;
}

export function useLaws() {
  return useQuery({
    queryKey: ['laws'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laws')
        .select('*')
        .order('law_book')
        .order('paragraph');

      if (error) throw error;

      return data.map((law): Law => ({
        id: law.id,
        lawBook: law.law_book,
        paragraph: law.paragraph,
        offense: law.offense,
        version: law.version,
        effectiveDate: new Date(law.effective_date),
      }));
    },
  });
}
