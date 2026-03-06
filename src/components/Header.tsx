import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Menu, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { MainMenu } from './MainMenu';

interface HeaderProps {
  title?: string;
  topicId?: string;
  hasExistingOpinion?: boolean;
  onOpinionSubmitted?: () => void;
  myOpinionId?: string;
  onChatOpen?: (theirOpinionId: string) => void;
  totalUnread?: number;
  unreadMessageCounts?: Map<string, number>;
  isLoading?: boolean;
  hideAddOpinion?: boolean;
  hideSidebarButtons?: boolean;
  onOpenOpinions?: () => void;
  onOpenChats?: () => void;
  onOpenRequests?: () => void;
}

export function Header({
  title, topicId, hasExistingOpinion, onOpinionSubmitted, myOpinionId,
  onChatOpen, totalUnread = 0, unreadMessageCounts,
  isLoading = false, hideAddOpinion = false,
  onOpenOpinions, onOpenChats, onOpenRequests,
}: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl md:text-2xl font-semibold text-white"
            >
              freemind
            </motion.span>
          </Link>

          {title && (
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 max-w-[50%]">
              <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Add Opinion button — keep when applicable */}
            <AnimatePresence>
              {user && topicId && !hasExistingOpinion && !isLoading && !hideAddOpinion && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  data-tutorial="add-opinion-button"
                >
                  <Button
                    onClick={onOpinionSubmitted}
                    data-opinion-dialog-trigger
                    className="h-12 px-4 md:px-5 text-base bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-lg shadow-accent/25 animate-pulse-fast"
                  >
                    <Pencil className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">{t('header.addOpinion')}</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Burger menu button */}
            <Button
              onClick={() => setMenuOpen(true)}
              size="icon"
              variant="outline"
              className="h-12 w-12 md:h-14 md:w-14 border-white/20 text-muted-foreground hover:text-foreground hover:bg-muted relative"
            >
              <Menu className="h-5 w-5 md:h-7 md:w-7" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <MainMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        topicId={topicId}
        onOpenOpinions={onOpenOpinions || (() => {})}
        onOpenChats={onOpenChats || (() => {})}
        onOpenRequests={onOpenRequests || (() => {})}
        totalUnread={totalUnread}
      />
    </>
  );
}
