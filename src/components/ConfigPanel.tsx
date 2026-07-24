import { Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { useHidePendingEdges } from '@/themes/ThemeContext';
import { AuthForm } from './AuthForm';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveChats?: boolean;
  firstChatOpinionId?: string | null;
}

export function ConfigPanel({ open, onOpenChange }: ConfigPanelProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { startTutorial, resetTutorialStatus } = useTutorialContext();
  const [hidePendingEdges, setHidePendingEdges] = useHidePendingEdges();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(t('config.signOutFailed', 'Failed to sign out'));
    } else {
      toast.success(t('config.signedOut', 'Signed out'));
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('config.settings')}
          </SheetTitle>
          <SheetDescription>{t('config.managePreferences')}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">{t('common.language')}</label>
            <LanguageSwitcher variant="full" />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium text-foreground">{t('config.hidePendingEdges')}</label>
              <p className="text-xs text-muted-foreground">{t('config.hidePendingEdgesDesc')}</p>
            </div>
            <Switch checked={hidePendingEdges} onCheckedChange={setHidePendingEdges} />
          </div>

          <div className="border-t border-border" />

          {user ? (
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.signOut')}
            </Button>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{t('common.logIn')}</label>
              <AuthForm
                compact
                initialMode="login"
                showModeSwitch={false}
                onSuccess={() => {
                  onOpenChange(false);
                  toast.success(t('auth.welcomeBack'));
                }}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
