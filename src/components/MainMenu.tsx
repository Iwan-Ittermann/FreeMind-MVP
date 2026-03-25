import { useState } from 'react';
import { Settings, LogOut, LogIn, Copy, Check, Download, Globe, Pencil, GraduationCap, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { emailToPassphrase } from '@/lib/passphrase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface MainMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId?: string;
  onTutorial?: () => void;
  onAbout?: () => void;
}

export function MainMenu({ open, onOpenChange, onTutorial, onAbout }: MainMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" hideClose className="max-h-[80vh] rounded-t-2xl flex flex-col pb-16 lg:mx-auto lg:max-w-[calc(100%-580px)] lg:min-w-[400px] lg:bottom-12">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('config.settings', 'Settings')}
          </SheetTitle>
          <SheetDescription className="sr-only">App settings</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 flex-1 overflow-y-auto">
          {/* Mobile-only: Tutorial & About buttons */}
          {isMobile && (
            <div className="flex gap-2">
              {onTutorial && (
                <button
                  onClick={() => { onOpenChange(false); onTutorial(); }}
                  className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <GraduationCap className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('tutorial.startTutorial', 'Tutorial')}</span>
                </button>
              )}
              {onAbout && (
                <button
                  onClick={() => { onOpenChange(false); onAbout(); }}
                  className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('about.title', 'About')}</span>
                </button>
              )}
            </div>
          )}

          {isMobile && (onTutorial || onAbout) && <div className="border-t border-border" />}

          {/* Login Secret */}
          {user && passphrase && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{t('config.yourPassphrase', 'Login Secret')}</label>
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

          <div className="border-t border-border" />

          {/* Language */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              {t('common.language', 'Language')}
            </label>
            <LanguageSwitcher variant="full" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          {user ? (
            <button onClick={handleSignOut} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
              <LogOut className="w-5 h-5" />
              <span>{t('common.signOut', 'Logout')}</span>
            </button>
          ) : (
            <button onClick={() => { onOpenChange(false); navigate('/auth'); }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-foreground">
              <LogIn className="w-5 h-5 text-muted-foreground" />
              <span>{t('common.signIn', 'Sign In')}</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
