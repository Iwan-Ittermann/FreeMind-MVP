import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Save, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTutorialSettings } from '@/hooks/useTutorialSettings';
import { toast } from 'sonner';

const UNIFIED_STEPS = [
  { id: 'welcome', defaultTitleEn: 'Welcome!', defaultTitleDe: 'Willkommen!' },
  { id: 'addOpinion', defaultTitleEn: 'Share Your Opinion', defaultTitleDe: 'Teile deine Meinung' },
  { id: 'yourTent', defaultTitleEn: 'Your Tent', defaultTitleDe: 'Dein Zelt' },
  { id: 'exploreOpinions', defaultTitleEn: 'Explore Others', defaultTitleDe: 'Entdecke Andere' },
  { id: 'requestChat', defaultTitleEn: 'Request a Chat', defaultTitleDe: 'Chat anfragen' },
  { id: 'nowWeWait', defaultTitleEn: 'Now We Wait!', defaultTitleDe: 'Jetzt warten wir!' },
  { id: 'chatStarted', defaultTitleEn: 'Your First Chat', defaultTitleDe: 'Dein erster Chat' },
  { id: 'done', defaultTitleEn: "You're Ready!", defaultTitleDe: 'Du bist bereit!' },
];

interface StepEditorProps {
  stepId: string;
  defaultTitle: string;
  language: 'en' | 'de';
}

function StepEditor({ stepId, defaultTitle, language }: StepEditorProps) {
  const { t } = useTranslation();
  const { getSetting, upsertSetting } = useTutorialSettings();

  const setting = getSetting('onboarding', stepId, language);

  const [customTitle, setCustomTitle] = useState(setting?.custom_title ?? '');
  const [customText, setCustomText] = useState(setting?.custom_text ?? '');
  const [isMuted, setIsMuted] = useState(setting?.is_muted ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertSetting.mutateAsync({
        tutorial_type: 'onboarding',
        step_id: stepId,
        language,
        custom_title: customTitle || null,
        custom_text: customText || null,
        is_muted: isMuted,
      });
      toast.success(t('admin.tutorial.saved', 'Step settings saved'));
    } catch {
      toast.error(t('admin.tutorial.saveError', 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMuteToggle = async (checked: boolean) => {
    setIsMuted(checked);
    try {
      await upsertSetting.mutateAsync({
        tutorial_type: 'onboarding',
        step_id: stepId,
        language,
        custom_title: customTitle || null,
        custom_text: customText || null,
        is_muted: checked,
      });
      toast.success(checked ? t('admin.tutorial.stepMuted', 'Step muted') : t('admin.tutorial.stepUnmuted', 'Step visible'));
    } catch {
      setIsMuted(!checked);
      toast.error(t('admin.tutorial.saveError', 'Failed to save'));
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMuted ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-success" />}
          <Label className="text-sm font-medium">
            {isMuted ? t('admin.tutorial.muted', 'Muted') : t('admin.tutorial.visible', 'Visible')}
          </Label>
        </div>
        <Switch checked={!isMuted} onCheckedChange={(checked) => handleMuteToggle(!checked)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`title-${stepId}-${language}`} className="text-sm">{t('admin.tutorial.customTitle', 'Custom Title')}</Label>
        <Input id={`title-${stepId}-${language}`} placeholder={defaultTitle} value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} disabled={isMuted} className="bg-background" />
        <p className="text-xs text-muted-foreground">{t('admin.tutorial.defaultLabel', 'Default')}: {defaultTitle}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`text-${stepId}-${language}`} className="text-sm">{t('admin.tutorial.customText', 'Custom Description')}</Label>
        <Textarea id={`text-${stepId}-${language}`} placeholder={t('admin.tutorial.leaveEmptyForDefault', 'Leave empty for default text')} value={customText} onChange={(e) => setCustomText(e.target.value)} disabled={isMuted} rows={3} className="bg-background" />
      </div>

      <Button onClick={handleSave} disabled={isSaving || isMuted} size="sm" className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? t('admin.tutorial.saving', 'Saving...') : t('admin.tutorial.save', 'Save')}
      </Button>
    </div>
  );
}

export function TutorialSettingsPanel() {
  const { t } = useTranslation();
  const { isLoading, getSetting } = useTutorialSettings();
  const [selectedLanguage, setSelectedLanguage] = useState<'de' | 'en'>('de');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t('admin.tutorial.title', 'Tutorial Settings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Label>{t('admin.tutorial.language', 'Language')}:</Label>
          <div className="flex gap-1">
            <Button variant={selectedLanguage === 'de' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedLanguage('de')}>DE</Button>
            <Button variant={selectedLanguage === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedLanguage('en')}>EN</Button>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {UNIFIED_STEPS.map((step, index) => {
            const setting = getSetting('onboarding', step.id, selectedLanguage);
            const defaultTitle = selectedLanguage === 'de' ? step.defaultTitleDe : step.defaultTitleEn;
            const isMuted = setting?.is_muted ?? false;

            return (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{index + 1}</span>
                    <span className={isMuted ? 'text-muted-foreground line-through' : ''}>
                      {setting?.custom_title || defaultTitle}
                    </span>
                    {isMuted && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <StepEditor stepId={step.id} defaultTitle={defaultTitle} language={selectedLanguage} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
