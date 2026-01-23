import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Search, X, Send, MessageSquare, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
}

interface OpinionItem {
  id: string;
  text: string;
  created_at: string;
  visible: boolean;
  notice_text: string | null;
  user_id: string;
}

export function OpinionsSidebar({ open, onOpenChange, topicId }: OpinionsSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedOpinionId, setExpandedOpinionId] = useState<string | null>(null);

  // Fetch chat requests for this topic
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

  // Fetch all opinions for the topic using the public view
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
    enabled: open && !!topicId,
  });

  // Find current user's opinion
  const myOpinion = opinions?.find(op => op.user_id === user?.id);

  const filteredOpinions = useMemo(() => {
    if (!opinions) return [];
    if (!search.trim()) return opinions;
    
    const query = search.toLowerCase();
    return opinions.filter(op => 
      op.text.toLowerCase().includes(query)
    );
  }, [opinions, search]);

  const handleOpinionClick = (opinionId: string) => {
    // Toggle expanded state
    setExpandedOpinionId(prev => prev === opinionId ? null : opinionId);
  };

  const handleRequestChat = async (targetOpinionId: string) => {
    if (!myOpinion) {
      toast.error(t('sidebar.submitOpinionFirst', 'Submit your opinion first to chat'));
      return;
    }
    try {
      await sendRequest({
        requesterOpinionId: myOpinion.id,
        targetOpinionId,
      });
      toast.success(t('index.chatRequestSent', 'Chat request sent!'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (targetOpinionId: string) => {
    if (!myOpinion) return;
    const request = getRequestBetween(myOpinion.id, targetOpinionId);
    if (!request) return;
    try {
      await acceptRequest(request.id);
      toast.success(t('index.chatRequestAccepted', 'Chat request accepted!'));
      navigate(`/chat?their=${targetOpinionId}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (targetOpinionId: string) => {
    if (!myOpinion) return;
    const request = getRequestBetween(myOpinion.id, targetOpinionId);
    if (!request) return;
    try {
      await declineRequest(request.id);
      toast.success(t('index.chatRequestDeclined', 'Chat request declined'));
      setExpandedOpinionId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline request');
    }
  };

  const handleOpenChat = (targetOpinionId: string) => {
    navigate(`/chat?their=${targetOpinionId}`);
    onOpenChange(false);
  };

  // Determine the action state for an opinion
  const getOpinionActionState = (opinion: OpinionItem) => {
    if (!user) return 'not_logged_in';
    if (!myOpinion) return 'no_opinion';
    if (opinion.user_id === user.id) return 'own';
    
    const isAccepted = hasAcceptedChat(myOpinion.id, opinion.id);
    if (isAccepted) return 'accepted';
    
    // Check if current user sent a request to this opinion
    const sentRequest = hasPendingRequest(myOpinion.id, opinion.id);
    if (sentRequest) return 'pending_sent';
    
    // Check if this opinion sent a request to current user
    const receivedRequest = hasPendingRequest(opinion.id, myOpinion.id);
    if (receivedRequest) return 'pending_received';
    
    return 'can_request';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            {t('sidebar.allOpinions', 'All Opinions')}
          </SheetTitle>
          <SheetDescription>
            {t('sidebar.browseOpinions', 'Browse all opinions on this topic')}
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('sidebar.searchOpinions', 'Search opinions...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Opinions List */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : filteredOpinions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {search 
                ? t('sidebar.noOpinionsFound', 'No opinions found')
                : t('sidebar.noOpinionsYet', 'No opinions yet')
              }
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredOpinions.map((opinion) => {
                const isExpanded = expandedOpinionId === opinion.id;
                const actionState = getOpinionActionState(opinion);
                
                return (
                  <div
                    key={opinion.id}
                    className="rounded-lg bg-muted/50 overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => handleOpinionClick(opinion.id)}
                      className="w-full text-left p-3 hover:bg-muted transition-colors"
                    >
                      {opinion.visible === false ? (
                        <p className="text-sm text-destructive/70 italic">
                          {opinion.notice_text || t('index.contentHidden')}
                        </p>
                      ) : (
                        <p className="text-sm text-foreground line-clamp-3">
                          "{opinion.text}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(opinion.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    
                    {/* Expanded Action Buttons */}
                    {isExpanded && opinion.visible !== false && (
                      <div className="px-3 pb-3 pt-1 border-t border-border/50">
                        {actionState === 'not_logged_in' && (
                          <Button
                            onClick={() => navigate('/auth')}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            {t('common.signIn', 'Sign In to Chat')}
                          </Button>
                        )}
                        
                        {actionState === 'no_opinion' && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            {t('sidebar.submitOpinionFirst', 'Submit your opinion first')}
                          </p>
                        )}
                        
                        {actionState === 'own' && (
                          <p className="text-xs text-muted-foreground italic text-center py-1">
                            {t('index.thisIsYourOpinion', 'This is your opinion')}
                          </p>
                        )}
                        
                        {actionState === 'accepted' && (
                          <Button
                            onClick={() => handleOpenChat(opinion.id)}
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {t('index.openChat', 'Open Chat')}
                          </Button>
                        )}
                        
                        {actionState === 'pending_sent' && (
                          <p className="text-xs text-accent italic text-center py-1">
                            ⏳ {t('index.waitingForAccept', 'Waiting for them to accept...')}
                          </p>
                        )}
                        
                        {actionState === 'pending_received' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAcceptRequest(opinion.id)}
                              disabled={isAccepting || isDeclining}
                              size="sm"
                              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              {isAccepting ? '...' : t('common.accept', 'Accept')}
                            </Button>
                            <Button
                              onClick={() => handleDeclineRequest(opinion.id)}
                              disabled={isAccepting || isDeclining}
                              variant="outline"
                              size="sm"
                              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              {isDeclining ? '...' : t('common.decline', 'Decline')}
                            </Button>
                          </div>
                        )}
                        
                        {actionState === 'can_request' && (
                          <Button
                            onClick={() => handleRequestChat(opinion.id)}
                            disabled={isSending}
                            variant="outline"
                            size="sm"
                            className="w-full border-accent text-accent hover:bg-accent/10"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {isSending ? '...' : t('index.requestToChat', 'Request Chat')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Count */}
        {opinions && opinions.length > 0 && (
          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            {filteredOpinions.length} {t('sidebar.of', 'of')} {opinions.length} {t('common.opinions')}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
