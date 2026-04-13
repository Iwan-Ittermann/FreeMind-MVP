import { useState, useMemo } from 'react';
import { List, Search, X, Send, MessageSquare, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatRequests } from '@/hooks/useChatRequests';
import { toast } from 'sonner';

interface OpinionsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  variant?: 'sheet' | 'inline';
  onOpinionClick?: (opinionId: string) => void;
  onChatOpen?: (theirOpinionId: string) => void;
  nodeAngles?: Map<string, number>;
}

interface OpinionItem {
  id: string;
  text: string;
  created_at: string;
  visible: boolean;
  notice_text: string | null;
  user_id: string;
}

export function OpinionsSidebar({ open, onOpenChange, topicId, variant = 'sheet', onOpinionClick, onChatOpen, nodeAngles }: OpinionsSidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedOpinionId, setExpandedOpinionId] = useState<string | null>(null);

  const { 
    sendRequest, 
    acceptRequest, 
    declineRequest,
    isSending,
    isAccepting,
    isDeclining,
    hasAcceptedChat,
    hasPendingRequest,
    getRequestBetween,
  } = useChatRequests(topicId);

  const { data: opinions, isLoading } = useQuery({
    queryKey: ['allOpinions', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id, text, created_at, visible, notice_text, user_id')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OpinionItem[];
    },
    enabled: (variant === 'inline' || open) && !!topicId,
  });

  const myOpinion = opinions?.find(op => op.user_id === user?.id);

  const filteredOpinions = useMemo(() => {
    if (!opinions) return [];
    let result = opinions;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(op => op.text.toLowerCase().includes(query));
    }
    // Sort by angular position if available, otherwise by created_at
    if (nodeAngles && nodeAngles.size > 0) {
      result = [...result].sort((a, b) => {
        const angleA = nodeAngles.get(a.id) ?? Infinity;
        const angleB = nodeAngles.get(b.id) ?? Infinity;
        return angleA - angleB;
      });
    }
    return result;
  }, [opinions, search, nodeAngles]);

  const handleOpinionClick = (opinionId: string) => {
    setExpandedOpinionId(prev => prev === opinionId ? null : opinionId);
    onOpinionClick?.(opinionId);
  };

  const handleRequestChat = async (targetOpinionId: string) => {
    if (!myOpinion) {
      toast.error(t('sidebar.submitOpinionFirst', 'Submit your opinion first to chat'));
      return;
    }
    try {
      await sendRequest({ requesterOpinionId: myOpinion.id, targetOpinionId });
    } catch (err: any) {
      toast.error(err.message || t('index.failedToSendRequest'));
    }
  };

  const handleAcceptRequest = async (targetOpinionId: string) => {
    if (!myOpinion) return;
    const request = getRequestBetween(myOpinion.id, targetOpinionId);
    if (!request) return;
    try {
      await acceptRequest(request.id);
      onChatOpen?.(targetOpinionId);
    } catch (err: any) {
      toast.error(err.message || t('index.failedToAcceptRequest'));
    }
  };

  const handleDeclineRequest = async (targetOpinionId: string) => {
    if (!myOpinion) return;
    const request = getRequestBetween(myOpinion.id, targetOpinionId);
    if (!request) return;
    try {
      await declineRequest(request.id);
      setExpandedOpinionId(null);
    } catch (err: any) {
      toast.error(err.message || t('index.failedToDeclineRequest'));
    }
  };

  const handleOpenChat = (targetOpinionId: string) => {
    onChatOpen?.(targetOpinionId);
  };

  const getOpinionActionState = (opinion: OpinionItem) => {
    if (!user) return 'not_logged_in';
    if (!myOpinion) return 'no_opinion';
    if (opinion.user_id === user.id) return 'own';
    if (hasAcceptedChat(myOpinion.id, opinion.id)) return 'accepted';
    if (hasPendingRequest(myOpinion.id, opinion.id)) return 'pending_sent';
    if (hasPendingRequest(opinion.id, myOpinion.id)) return 'pending_received';
    return 'can_request';
  };

  const content = (
    <div className="flex flex-col h-full">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('sidebar.searchOpinions', 'Search opinions...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 h-9 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Opinions List */}
      <ScrollArea className="flex-1 mt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{t('common.loading')}</div>
        ) : filteredOpinions.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            {search ? t('sidebar.noOpinionsFound', 'No opinions found') : t('sidebar.noOpinionsYet', 'No opinions yet')}
          </div>
        ) : (
          <div className="space-y-1.5 pb-4">
            {filteredOpinions.map((opinion) => {
              const isExpanded = expandedOpinionId === opinion.id;
              const actionState = getOpinionActionState(opinion);
              return (
                <motion.div key={opinion.id} layout transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="rounded-lg bg-muted/50 overflow-hidden transition-colors">
                  <button
                    onClick={() => handleOpinionClick(opinion.id)}
                    className="w-full text-left p-2.5 hover:bg-muted transition-colors flex items-start gap-2"
                  >
                    {opinion.visible === false ? (
                      <p className="text-xs text-destructive/70 italic">{opinion.notice_text || t('index.contentHidden')}</p>
                    ) : (
                      <p className="text-xs text-foreground line-clamp-2">"{opinion.text}"</p>
                    )}
                  </button>
                  {isExpanded && opinion.visible !== false && (
                    <div className="px-2.5 pb-2.5 pt-1 border-t border-border/50">
                      {actionState === 'not_logged_in' && (
                        <p className="text-xs text-muted-foreground text-center py-1">{t('common.signIn', 'Sign in to interact')}</p>
                      )}
                      {actionState === 'no_opinion' && (
                        <p className="text-xs text-muted-foreground text-center py-1">{t('sidebar.submitOpinionFirst', 'Submit your opinion first')}</p>
                      )}
                      {actionState === 'own' && (
                        <p className="text-xs text-muted-foreground italic text-center py-1">{t('index.thisIsYourOpinion', 'This is your opinion')}</p>
                      )}
                      {actionState === 'accepted' && (
                        <Button onClick={() => handleOpenChat(opinion.id)} size="sm" className="w-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />{t('index.openChat', 'Open Chat')}
                        </Button>
                      )}
                      {actionState === 'pending_sent' && (
                        <p className="text-xs text-accent italic text-center py-1">⏳ {t('index.waitingForAccept', 'Waiting for them to accept...')}</p>
                      )}
                      {actionState === 'pending_received' && (
                        <div className="flex gap-1.5">
                          <Button onClick={() => handleAcceptRequest(opinion.id)} disabled={isAccepting || isDeclining} size="sm" className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Check className="w-3.5 h-3.5 mr-1" />{isAccepting ? '...' : t('common.accept', 'Accept')}
                          </Button>
                          <Button onClick={() => handleDeclineRequest(opinion.id)} disabled={isAccepting || isDeclining} variant="outline" size="sm" className="flex-1 h-8 text-xs border-destructive text-destructive hover:bg-destructive/10">
                            <X className="w-3.5 h-3.5 mr-1" />{isDeclining ? '...' : t('common.decline', 'Decline')}
                          </Button>
                </div>
                      )}
                      {actionState === 'can_request' && (
                        <Button onClick={() => handleRequestChat(opinion.id)} disabled={isSending} variant="outline" size="sm" className="w-full h-8 text-xs border-accent text-accent hover:bg-accent/10">
                          <Send className="w-3.5 h-3.5 mr-1.5" />{isSending ? '...' : t('index.requestToChat', 'Request Chat')}
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            {t('sidebar.allOpinions', 'All Opinions')}
          </SheetTitle>
          <SheetDescription>{t('sidebar.browseOpinions', 'Browse all opinions on this topic')}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 mt-3 flex flex-col overflow-hidden">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
