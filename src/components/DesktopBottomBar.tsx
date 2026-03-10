import { List, Info, GraduationCap, Settings, MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DesktopBottomBarProps {
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onAbout: () => void;
  onTutorial: () => void;
  onSettings: () => void;
  totalUnread?: number;
}

export function DesktopBottomBar({
  leftOpen, rightOpen,
  onToggleLeft, onToggleRight,
  onAbout, onTutorial, onSettings,
  totalUnread = 0,
}: DesktopBottomBarProps) {
  const { t } = useTranslation();

  const btnBase = "flex items-center justify-center gap-2 h-full text-sm font-medium transition-colors relative";

  const activeGlow = "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-10 after:h-[2px] after:rounded-full after:bg-accent after:shadow-[0_0_8px_2px_hsla(var(--accent)/0.5)]";

  return (
    <div className="hidden md:flex h-12 border-t border-border/20 bg-background/60 backdrop-blur-xl flex-shrink-0">
      <button
        onClick={onToggleLeft}
        className={`${btnBase} flex-[2] ${leftOpen ? `text-foreground bg-muted/30 ${activeGlow}` : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
      >
        <List className="w-4 h-4" />
        <span>{t('sidebar.allOpinions', 'Opinions')}</span>
      </button>

      <button onClick={onAbout} className={`${btnBase} flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/20`}>
        <Info className="w-4 h-4" />
        <span>{t('about.title', 'About')}</span>
      </button>

      <button onClick={onTutorial} className={`${btnBase} flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/20`}>
        <GraduationCap className="w-4 h-4" />
        <span>{t('tutorial.startTutorial', 'Tutorial')}</span>
      </button>

      <button onClick={onSettings} className={`${btnBase} flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/20`}>
        <Settings className="w-4 h-4" />
        <span>{t('config.settings', 'Settings')}</span>
      </button>

      <button
        onClick={onToggleRight}
        className={`${btnBase} flex-[2] ${rightOpen ? `text-foreground bg-muted/30 ${activeGlow}` : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
      >
        <MessagesSquare className="w-4 h-4" />
        <span>{t('sidebar.myChats', 'Chats')}</span>
        {totalUnread > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
