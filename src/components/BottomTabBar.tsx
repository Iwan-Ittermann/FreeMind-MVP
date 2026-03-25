import { MessagesSquare, List, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type MobilePanel = 'chats' | 'opinions' | 'menu' | null;

interface BottomTabBarProps {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
  totalUnread?: number;
}

export function BottomTabBar({ activePanel, onPanelChange, totalUnread = 0 }: BottomTabBarProps) {
  const { t } = useTranslation();

  const handleTap = (panel: MobilePanel) => {
    onPanelChange(activePanel === panel ? null : panel);
  };

  const isActive = (panel: MobilePanel) => activePanel === panel;

  const btnClass = (panel: MobilePanel) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors relative ${
      isActive(panel) ? 'text-accent' : 'text-muted-foreground'
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] h-16 border-t border-border/20 bg-background/60 backdrop-blur-xl flex items-stretch lg:hidden">
      <button className={btnClass('opinions')} onClick={() => handleTap('opinions')}>
        <List className="h-6 w-6" />
        <span className="text-xs font-medium">{t('sidebar.allOpinions', 'Opinions')}</span>
        {isActive('opinions') && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-accent shadow-[0_0_8px_2px_hsla(var(--accent)/0.5)]" />
        )}
      </button>

      <button className={btnClass('menu')} onClick={() => handleTap('menu')}>
        <MoreHorizontal className="h-6 w-6" />
        <span className="text-xs font-medium">{t('common.menu', 'Menu')}</span>
        {isActive('menu') && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-accent shadow-[0_0_8px_2px_hsla(var(--accent)/0.5)]" />
        )}
      </button>

      <button className={btnClass('chats')} onClick={() => handleTap('chats')}>
        <MessagesSquare className="h-6 w-6" />
        <span className="text-xs font-medium">{t('sidebar.myChats', 'Chats')}</span>
        {totalUnread > 0 && (
          <span className="absolute top-1 right-[calc(50%-18px)] min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
        {isActive('chats') && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-accent shadow-[0_0_8px_2px_hsla(var(--accent)/0.5)]" />
        )}
      </button>
    </div>
  );
}
