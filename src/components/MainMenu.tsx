import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, GraduationCap, Settings, List, MessagesSquare, Inbox, LogOut, LogIn, ArrowLeft, Copy, Check, Download, Globe, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTutorialContext } from '@/contexts/TutorialContext';
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
  onOpenOpinions: () => void;
  onOpenChats: () => void;
  onOpenRequests: () => void;
  totalUnread?: number;
}

export function MainMenu({ open, onOpenChange, topicId, onOpenOpinions, onOpenChats, onOpenRequests, totalUnread = 0 }: MainMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const tutorial = useTutorialContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const handleAbout = () => {
    onOpenChange(false);
    navigate('/');
  };

  const handleTutorial = () => {
    if (!user) {
      onOpenChange(false);
      navigate('/auth');
      return;
    }
    onOpenChange(false);
    tutorial.resetTutorialStatus();
    setTimeout(() => tutorial.startTutorial(), 300);
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

  const menuItemClass = "flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left text-foreground";

  return (
    <>
      <Sheet open={open && !settingsOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-lg">freemind</SheetTitle>
            <SheetDescription className="sr-only">Navigation menu</SheetDescription>
          </SheetHeader>

          <nav className="flex-1 mt-4 space-y-1">
            <button onClick={handleAbout} className={menuItemClass}>
              <Info className="w-5 h-5 text-muted-foreground" />
              <span>{t('about.title', 'About')}</span>
            </button>

            <button onClick={handleTutorial} className={menuItemClass}>
              <GraduationCap className="w-5 h-5 text-muted-foreground" />
              <span>{t('tutorial.startTutorial', 'Tutorial')}</span>
            </button>

            <button onClick={() => { setSettingsOpen(true); }} className={menuItemClass}>
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span>{t('config.settings', 'Settings')}</span>
            </button>

            <div className="border-t border-border my-2" />

            {topicId && (
              <>
                <button onClick={() => { onOpenChange(false); onOpenOpinions(); }} className={menuItemClass}>
                  <List className="w-5 h-5 text-muted-foreground" />
                  <span>{t('sidebar.allOpinions', 'All Opinions')}</span>
                </button>

                {user && (
                  <>
                    <button onClick={() => { onOpenChange(false); onOpenRequests(); }} className={menuItemClass}>
                      <Inbox className="w-5 h-5 text-muted-foreground" />
                      <span>{t('sidebar.requests', 'Your Requests')}</span>
                    </button>

                    <button onClick={() => { onOpenChange(false); onOpenChats(); }} className={menuItemClass}>
                      <MessagesSquare className="w-5 h-5 text-muted-foreground" />
                      <span>{t('sidebar.myChats', 'Your Chats')}</span>
                      {totalUnread > 0 && (
                        <span className="ml-auto min-w-[20px] h-[20px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </nav>

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

      {/* Nested Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={(v) => { setSettingsOpen(v); if (!v) onOpenChange(true); }}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <button onClick={() => setSettingsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Settings className="w-5 h-5" />
              {t('config.settings', 'Settings')}
            </SheetTitle>
            <SheetDescription className="sr-only">App settings</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 flex-1">
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

            {/* Change Opinion (placeholder) */}
            <div className="space-y-2">
              <button disabled className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed">
                <Pencil className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <span className="text-sm">{t('config.changeOpinion', 'Change Opinion')}</span>
                  <p className="text-xs opacity-60">{t('common.comingSoon', 'Coming soon')}</p>
                </div>
              </button>
            </div>

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
        </SheetContent>
      </Sheet>
    </>
  );
}
