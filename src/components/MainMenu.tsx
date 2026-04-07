import { useState } from 'react';
import { Settings, LogOut, LogIn, Copy, Check, Download, Globe, GraduationCap, Info, Send, Filter } from 'lucide-react';
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

interface MenuContentProps {
  onClose: () => void;
  onTutorial?: () => void;
  onAbout?: () => void;
  onSignIn?: () => void;
  /** Show inline opinion CTA inside menu (mobile + chats open) */
  showOpinionCta?: boolean;
  opinionCtaNode?: React.ReactNode;
  /** Chat activity filter: 0 = show all, 1-4 = last N weeks */
  chatAgeFilterWeeks?: number;
  onChatAgeFilterChange?: (weeks: number) => void;
}

export function MenuContent({ onClose, onTutorial, onAbout, onSignIn, showOpinionCta, opinionCtaNode, chatAgeFilterWeeks = 0, onChatAgeFilterChange }: MenuContentProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  const passphrase = user?.email ? emailToPassphrase(user.email) : null;

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(t('config.signOutFailed', 'Failed to sign out'));
    } else {
      toast.success(t('config.signedOut', 'Signed out'));
      onClose();
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" />
        <span className="font-semibold">{t('config.settings', 'Settings')}</span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Opinion CTA moved here when chats panel is active on mobile */}
        {showOpinionCta && opinionCtaNode && (
          <>
            {opinionCtaNode}
            <div className="border-t border-border" />
          </>
        )}

        {/* Tutorial & About buttons */}
        <div className="flex gap-2">
          {onTutorial && (
            <button
              onClick={() => { onClose(); onTutorial(); }}
              className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              <GraduationCap className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('tutorial.startTutorial', 'Tutorial')}</span>
            </button>
          )}
          {onAbout && (
            <button
              onClick={() => { onClose(); onAbout(); }}
              className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              <Info className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('about.title', 'About')}</span>
            </button>
          )}
        </div>

        {(onTutorial || onAbout) && <div className="border-t border-border" />}

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

        {/* Chat Activity Filter */}
        {onChatAgeFilterChange && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {t('settings.chatActivityFilter', 'Chat Activity Filter')}
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={chatAgeFilterWeeks}
                  onChange={(e) => onChatAgeFilterChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{t('settings.filterAll', 'All')}</span>
                  <span>4w</span>
                  <span>3w</span>
                  <span>2w</span>
                  <span>1w</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {chatAgeFilterWeeks === 0
                    ? t('settings.filterShowAll', 'Showing all opinions')
                    : t('settings.filterShowRecent', 'Showing opinions with chats in last {{weeks}} week(s)', { weeks: 5 - chatAgeFilterWeeks })}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4">
        {user ? (
          <button onClick={handleSignOut} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
            <LogOut className="w-5 h-5" />
            <span>{t('common.signOut', 'Logout')}</span>
          </button>
        ) : (
          <button onClick={() => { onClose(); onSignIn?.(); }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-foreground">
            <LogIn className="w-5 h-5 text-muted-foreground" />
            <span>{t('common.signInOrSignUp', 'Sign In / Sign Up')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Desktop-only: renders as a Sheet. Mobile uses MenuContent inside BottomPanel. */
interface MainMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId?: string;
  onTutorial?: () => void;
  onAbout?: () => void;
  onSignIn?: () => void;
  chatAgeFilterWeeks?: number;
  onChatAgeFilterChange?: (weeks: number) => void;
}

export function MainMenu({ open, onOpenChange, onTutorial, onAbout, onSignIn, chatAgeFilterWeeks, onChatAgeFilterChange }: MainMenuProps) {
  const { t } = useTranslation();

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
        <div className="mt-2 flex-1 overflow-hidden">
          <MenuContent
            onClose={() => onOpenChange(false)}
            onTutorial={onTutorial}
            onAbout={onAbout}
            onSignIn={onSignIn}
            chatAgeFilterWeeks={chatAgeFilterWeeks}
            onChatAgeFilterChange={onChatAgeFilterChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
