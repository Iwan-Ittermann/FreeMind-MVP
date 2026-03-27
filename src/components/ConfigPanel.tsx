import { Link, useNavigate } from 'react-router-dom';
import { Settings, Download, Copy, Check, Info, LogIn, LogOut, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { emailToPassphrase } from '@/lib/passphrase';
import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { useHidePendingEdges } from '@/themes/ThemeContext';
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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { startTutorial, resetTutorialStatus } = useTutorialContext();
  const [copied, setCopied] = useState(false);
  const [hidePendingEdges, setHidePendingEdges] = useHidePendingEdges();

  const passphrase = user?.email ? emailToPassphrase(user.email) : null;

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(t('config.signOutFailed', 'Failed to sign out'));
    } else {
      toast.success(t('config.signedOut', 'Signed out'));
      onOpenChange(false);
    }
  };

  const handleCopy = async () => {
    if (!passphrase) return;
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      toast.success(t('config.passphraseCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('config.failedToCopy'));
    }
  };

  const handleDownload = () => {
    if (!passphrase) return;
    const content = `${t('auth.downloadFileTitle')}\n========================\n\n${passphrase}\n\n${t('auth.downloadFileWarning')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freemind-passphrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('config.passphraseDownloaded'));
  };

  const handleRestartTutorial = () => {
    if (!user) {
      onOpenChange(false);
      navigate('/');
      return;
    }
    onOpenChange(false);
    resetTutorialStatus();
    setTimeout(() => startTutorial(), 300);
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

          <div className="space-y-3">
            <Link
              to="/about"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t('about.title', 'About FreeMind')}</span>
            </Link>
            <button
              onClick={handleRestartTutorial}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t('tutorial.startTutorial', 'Start Tutorial')}</span>
            </button>
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

          {user && passphrase && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{t('config.yourPassphrase')}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-muted font-mono text-sm text-foreground truncate">
                  {passphrase}
                </div>
                <Button size="icon" variant="outline" onClick={handleCopy} className="h-9 w-9 shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={handleDownload} className="h-9 w-9 shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('config.savePassphraseNote')}</p>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground">{t('config.signInToViewSettings')}</p>
          )}

          <div className="border-t border-border" />

          <div className="space-y-3">
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
              <Link to="/auth" onClick={() => onOpenChange(false)}>
                <Button className="w-full justify-start bg-primary hover:bg-primary/90">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('common.signIn')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
