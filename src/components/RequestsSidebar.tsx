import { useState, useMemo } from 'react';
import { Inbox, Search, X, Check, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useChatRequests } from '@/hooks/useChatRequests';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RequestsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
}

interface PendingRequestItem {
  id: string;
  requester_opinion_id: string;
  target_opinion_id: string;
  created_at: string;
  other_opinion_text: string;
  direction: 'incoming' | 'outgoing';
}

export function RequestsSidebar({ open, onOpenChange, topicId }: RequestsSidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const { acceptRequest, declineRequest, isAccepting, isDeclining } = useChatRequests(topicId);

  const { data: myOpinion } = useQuery({
    queryKey: ['myOpinionForTopic', topicId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id')
        .eq('topic_id', topicId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!topicId && !!user?.id,
  });

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['myPendingRequests', topicId, myOpinion?.id],
    queryFn: async () => {
      if (!myOpinion?.id) return [];
      const { data: reqData, error } = await supabase
        .from('chat_requests')
        .select('id, requester_opinion_id, target_opinion_id, created_at, status')
        .eq('topic_id', topicId)
        .eq('status', 'pending')
        .or(`requester_opinion_id.eq.${myOpinion.id},target_opinion_id.eq.${myOpinion.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!reqData?.length) return [];

      const otherOpinionIds = reqData.map(req =>
        req.requester_opinion_id === myOpinion.id ? req.target_opinion_id : req.requester_opinion_id
      );
      const { data: opinionsData } = await supabase
        .from('opinions_public')
        .select('id, text')
        .in('id', otherOpinionIds);
      const opinionTextMap = new Map(opinionsData?.map(o => [o.id, o.text]) || []);

      return reqData.map(req => {
        const isOutgoing = req.requester_opinion_id === myOpinion.id;
        const otherOpinionId = isOutgoing ? req.target_opinion_id : req.requester_opinion_id;
        return {
          id: req.id,
          requester_opinion_id: req.requester_opinion_id,
          target_opinion_id: req.target_opinion_id,
          created_at: req.created_at,
          other_opinion_text: opinionTextMap.get(otherOpinionId) || t('floatingChat.unknownOpinion'),
          direction: isOutgoing ? 'outgoing' : 'incoming',
        } as PendingRequestItem;
      });
    },
    enabled: open && !!myOpinion?.id,
  });

  const filtered = useMemo(() => {
    if (!pendingRequests) return [];
    if (!search.trim()) return pendingRequests;
    const q = search.toLowerCase();
    return pendingRequests.filter(r => r.other_opinion_text.toLowerCase().includes(q));
  }, [pendingRequests, search]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return t('sidebar.yesterday', 'Yesterday');
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            {t('sidebar.requests', 'Your Requests')}
          </SheetTitle>
          <SheetDescription>
            {t('sidebar.pendingRequests', 'Pending chat requests')}
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t('sidebar.signInToSeeChats', 'Sign in to see your requests')}
          </div>
        ) : !myOpinion ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
            {t('sidebar.submitOpinionFirst', 'Submit your opinion first')}
          </div>
        ) : (
          <>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sidebar.searchRequests', 'Search requests...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <ScrollArea className="flex-1 mt-3 -mx-6 px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">{t('common.loading')}</div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  {search ? t('sidebar.noRequestsFound', 'No requests found') : t('sidebar.noRequestsYet', 'No pending requests')}
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filtered.map((req) => (
                    <div
                      key={req.id}
                      className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setExpandedRequestId(prev => prev === req.id ? null : req.id)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <span className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded mb-1 ${
                            req.direction === 'incoming'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {req.direction === 'incoming' ? t('sidebar.incoming', 'Incoming') : t('sidebar.outgoing', 'Outgoing')}
                          </span>
                          <p className="text-sm text-foreground line-clamp-2">"{req.other_opinion_text}"</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(req.created_at)}</span>
                      </div>
                      {expandedRequestId === req.id && req.direction === 'incoming' && (
                        <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isAccepting || isDeclining} onClick={() => acceptRequest(req.id)}>
                            <Check className="w-4 h-4 mr-1" />{isAccepting ? '...' : t('sidebar.accept', 'Accept')}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" disabled={isAccepting || isDeclining} onClick={() => declineRequest(req.id)}>
                            <X className="w-4 h-4 mr-1" />{isDeclining ? '...' : t('sidebar.decline', 'Decline')}
                          </Button>
                        </div>
                      )}
                      {expandedRequestId === req.id && req.direction === 'outgoing' && (
                        <p className="text-xs text-muted-foreground italic mt-2">
                          {t('sidebar.waitingForAccept', 'Waiting for them to accept...')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {pendingRequests && pendingRequests.length > 0 && (
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                {filtered.length} {t('sidebar.of', 'of')} {pendingRequests.length} {t('sidebar.requests', 'requests')}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
