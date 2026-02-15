import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, List, MessagesSquare, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubmitOpinionDialog } from './SubmitOpinionDialog';
import { OpinionsSidebar } from './OpinionsSidebar';
import { ChatsSidebar } from './ChatsSidebar';

interface HeaderProps {
  title?: string;
  topicId?: string;
  hasExistingOpinion?: boolean;
  onOpinionSubmitted?: () => void;
  myOpinionId?: string;
  onChatOpen?: (theirOpinionId: string) => void;
}

export function Header({ title, topicId, hasExistingOpinion, onOpinionSubmitted, myOpinionId, onChatOpen }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opinionDialogOpen, setOpinionDialogOpen] = useState(false);
  const [opinionsOpen, setOpinionsOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(false);

  const { data: userChats } = useQuery({
    queryKey: ['userChatsForTutorial', topicId, myOpinionId],
    queryFn: async () => {
      if (!myOpinionId || !topicId) return [];
      const { data, error } = await supabase
        .from('chats')
        .select('id, opinion_a_id, opinion_b_id')
        .eq('topic_id', topicId)
        .or(`opinion_a_id.eq.${myOpinionId},opinion_b_id.eq.${myOpinionId}`)
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    enabled: !!myOpinionId && !!topicId,
  });

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
          <Link to="/" className="flex items-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-medium text-white"
            >
              freemind
            </motion.span>
          </Link>

          {title && (
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 max-w-[40%] pr-4">
              <h1 className="text-sm font-medium text-white/80 truncate">{title}</h1>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!user && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Button
                  onClick={() => navigate('/auth')}
                  className="h-9 px-3 md:px-4 bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-lg shadow-accent/25 animate-pulse-fast"
                >
                  <UserPlus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{t('common.signUp')}</span>
                </Button>
              </motion.div>
            )}

            {/* Add Opinion — animated out after submission */}
            <AnimatePresence>
              {showOpinionButton && canAddOpinion && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  data-tutorial="add-opinion-button"
                >
                  <Button
                    onClick={() => setOpinionDialogOpen(true)}
                    className="h-9 px-3 md:px-4 bg-accent text-accent-foreground hover:bg-accent/90 font-medium shadow-lg shadow-accent/25 animate-pulse-fast"
                  >
                    <Pencil className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">{t('header.addOpinion')}</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {topicId && (
              <Button
                onClick={() => { setOpinionsOpen(true); setChatsOpen(false); }}
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={t('sidebar.allOpinions', 'All Opinions')}
                data-tutorial="opinions-button"
              >
                <List className="h-4 w-4" />
              </Button>
            )}

            {topicId && user && (
              <Button
                onClick={() => { setChatsOpen(true); setOpinionsOpen(false); }}
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={t('sidebar.myChats', 'My Chats')}
                data-tutorial="chats-button"
              >
                <MessagesSquare className="h-4 w-4" />
              </Button>
            )}

            {/* Settings button removed from header — now floating on /home */}
          </div>
        </div>
      </header>

      {topicId && (
        <SubmitOpinionDialog
          open={opinionDialogOpen}
          onOpenChange={setOpinionDialogOpen}
          topicId={topicId}
          topicTitle={title}
          onSuccess={handleOpinionSuccess}
          hasExistingOpinion={hasExistingOpinion}
        />
      )}

      {topicId && (
        <OpinionsSidebar open={opinionsOpen} onOpenChange={setOpinionsOpen} topicId={topicId} />
      )}

      {topicId && (
        <ChatsSidebar open={chatsOpen} onOpenChange={setChatsOpen} topicId={topicId} onChatOpen={onChatOpen} />
      )}
    </>
  );
}
