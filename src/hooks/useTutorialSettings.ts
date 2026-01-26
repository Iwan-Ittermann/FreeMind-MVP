import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TutorialSetting {
  id: string;
  tutorial_type: 'onboarding' | 'chat';
  step_id: string;
  language: string;
  custom_title: string | null;
  custom_text: string | null;
  is_muted: boolean;
  created_at: string;
  updated_at: string;
}

interface UpsertTutorialSettingParams {
  tutorial_type: 'onboarding' | 'chat';
  step_id: string;
  language: string;
  custom_title?: string | null;
  custom_text?: string | null;
  is_muted?: boolean;
}

export function useTutorialSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tutorialSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutorial_settings')
        .select('*');
      
      if (error) throw error;
      return data as TutorialSetting[];
    },
  });

  const upsertSetting = useMutation({
    mutationFn: async (params: UpsertTutorialSettingParams) => {
      const { data, error } = await supabase
        .from('tutorial_settings')
        .upsert({
          tutorial_type: params.tutorial_type,
          step_id: params.step_id,
          language: params.language,
          custom_title: params.custom_title,
          custom_text: params.custom_text,
          is_muted: params.is_muted ?? false,
        }, {
          onConflict: 'tutorial_type,step_id,language',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorialSettings'] });
    },
  });

  const getSetting = (tutorialType: 'onboarding' | 'chat', stepId: string, language: string) => {
    return settings?.find(
      s => s.tutorial_type === tutorialType && s.step_id === stepId && s.language === language
    );
  };

  const isStepMuted = (tutorialType: 'onboarding' | 'chat', stepId: string, language: string) => {
    const setting = getSetting(tutorialType, stepId, language);
    return setting?.is_muted ?? false;
  };

  const getCustomTitle = (tutorialType: 'onboarding' | 'chat', stepId: string, language: string) => {
    const setting = getSetting(tutorialType, stepId, language);
    return setting?.custom_title ?? null;
  };

  const getCustomText = (tutorialType: 'onboarding' | 'chat', stepId: string, language: string) => {
    const setting = getSetting(tutorialType, stepId, language);
    return setting?.custom_text ?? null;
  };

  return {
    settings,
    isLoading,
    upsertSetting,
    getSetting,
    isStepMuted,
    getCustomTitle,
    getCustomText,
  };
}
