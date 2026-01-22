import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Pencil, Settings, MessageCircle, MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { SubmitOpinionDialog } from './SubmitOpinionDialog';
import { ConfigPanel } from './ConfigPanel';

import { OpinionsSidebar } from './OpinionsSidebar';
import { ChatsSidebar } from './ChatsSidebar';
interface HeaderProps {
  title?: string;
  topicId?: string;
  hasExistingOpinion?: boolean;
  onOpinionSubmitted?: () => void;
}

export function Header({ title, topicId, hasExistingOpinion, onOpinionSubmitted }: HeaderProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [opinionDialogOpen, setOpinionDialogOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [opinionsOpen, setOpinionsOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(false);

  const handleOpinionSuccess = () => {
    setOpinionDialogOpen(false);
    onOpinionSubmitted?.();
  };

  const showOpinionButton = user && topicId;
  const canAddOpinion = !hasExistingOpinion;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/" className="flex items-center">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-medium text-white"
            >
              freemind
            </motion.span>
          </Link>

          {/* Center: Title (desktop only) */}
          {title && (
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-sm font-medium text-white/80 max-w-md truncate">
                {title}
              </h1>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Add Opinion Button - prominent CTA, greyed out if opinion exists */}
            {showOpinionButton && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <Button
                  onClick={() => canAddOpinion && setOpinionDialogOpen(true)}
                  disabled={!canAddOpinion}
                  className={canAddOpinion 
                    ? "h-9 px-3 md:px-4 bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-lg shadow-accent/25 animate-pulse"
                    : "h-9 px-3 md:px-4 bg-muted text-muted-foreground cursor-not-allowed"
                  }
                >
                  <Pencil className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t('header.addOpinion')}</span>
                </Button>
              </motion.div>
            )}

            {/* Opinions Sidebar Button */}
            {topicId && (
              <Button
                onClick={() => { setOpinionsOpen(true); setChatsOpen(false); }}
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={t('sidebar.allOpinions', 'All Opinions')}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}

            {/* Chats Sidebar Button */}
            {topicId && user && (
              <Button
                onClick={() => { setChatsOpen(true); setOpinionsOpen(false); }}
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={t('sidebar.myChats', 'My Chats')}
              >
                <MessagesSquare className="h-4 w-4" />
              </Button>
            )}

            {/* Config Button */}
            <Button
              onClick={() => setConfigOpen(true)}
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
            </Button>

          </div>
        </div>
      </header>

      {/* Opinion Dialog */}
      {topicId && (
        <SubmitOpinionDialog
          open={opinionDialogOpen}
          onOpenChange={setOpinionDialogOpen}
          topicId={topicId}
          onSuccess={handleOpinionSuccess}
          hasExistingOpinion={hasExistingOpinion}
        />
      )}

      {/* Config Panel */}
      <ConfigPanel open={configOpen} onOpenChange={setConfigOpen} />

      {/* Opinions Sidebar */}
      {topicId && (
        <OpinionsSidebar 
          open={opinionsOpen} 
          onOpenChange={setOpinionsOpen} 
          topicId={topicId} 
        />
      )}

      {/* Chats Sidebar */}
      {topicId && (
        <ChatsSidebar 
          open={chatsOpen} 
          onOpenChange={setChatsOpen} 
          topicId={topicId} 
        />
      )}
    </>
  );
}
