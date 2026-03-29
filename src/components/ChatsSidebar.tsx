import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MessagesSquare, Inbox, Search, X, Check, Clock, ArrowLeft, Send } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmbeddedChatView } from '@/components/chat/EmbeddedChatView';

interface ChatsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  onChatOpen?: (theirOpinionId: string) => void;
  unreadMessageCounts?: Map<string, number>;
  variant?: 'sheet' | 'inline';
  onChatClick?: (theirOpinionId: string) => void;
  onSignIn?: () => void;
  opinionCtaNode?: React.ReactNode;
}

interface ChatItem {
  id: string;
  opinion_a_id: string;
  opinion_b_id: string;
  created_at: string;
  other_opinion_text: string;
  last_message?: string;
  last_message_at?: string;
}

interface PendingRequestItem {
  id: string;
  requester_opinion_id: string;
  target_opinion_id: string;
  created_at: string;
  other_opinion_text: string;
  direction: 'incoming' | 'outgoing';
}

export function ChatsSidebar({ open, onOpenChange, topicId, onChatOpen, unreadMessageCounts, variant = 'sheet', onChatClick, onSignIn, opinionCtaNode }: ChatsSidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [activeChatOpinionId, setActiveChatOpinionId] = useState<string | null>(null);
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
    enabled: (variant === 'inline' || open) && !!topicId && !!user?.id,
  });

  // Fetch chats
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['myChats', topicId, myOpinion?.id],
    queryFn: async () => {
      if (!myOpinion?.id) return [];
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('id, opinion_a_id, opinion_b_id, created_at')
        .eq('topic_id', topicId)
        .or(`opinion_a_id.eq.${myOpinion.id},opinion_b_id.eq.${myOpinion.id}`)
        .order('created_at', { ascending: false });
      if (chatError) throw chatError;
      if (!chatData?.length) return [];

      const otherOpinionIds = chatData.map(chat =>
        chat.opinion_a_id === myOpinion.id ? chat.opinion_b_id : chat.opinion_a_id
      );
      const { data: opinionsData } = await supabase
        .from('opinions_public')
        .select('id, text')
        .in('id', otherOpinionIds);

      const chatIds = chatData.map(c => c.id);
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('chat_id, content, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      const lastMessageMap = new Map<string, { content: string; created_at: string }>();
      messagesData?.forEach(msg => {
        if (!lastMessageMap.has(msg.chat_id)) {
          lastMessageMap.set(msg.chat_id, { content: msg.content, created_at: msg.created_at });
        }
      });

      const opinionTextMap = new Map(opinionsData?.map(o => [o.id, o.text]) || []);

      return chatData.map(chat => {
        const otherOpinionId = chat.opinion_a_id === myOpinion.id ? chat.opinion_b_id : chat.opinion_a_id;
        const lastMsg = lastMessageMap.get(chat.id);
        return {
          id: chat.id,
          opinion_a_id: chat.opinion_a_id,
          opinion_b_id: chat.opinion_b_id,
          created_at: chat.created_at,
          other_opinion_text: opinionTextMap.get(otherOpinionId) || t('floatingChat.unknownOpinion'),
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        } as ChatItem;
      });
    },
    enabled: (variant === 'inline' || open) && !!myOpinion?.id,
  });

  // Fetch pending requests
  const { data: pendingRequests, isLoading: requestsLoading } = useQuery({
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
    enabled: (variant === 'inline' || open) && !!myOpinion?.id,
  });

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!search.trim()) return chats;
    const query = search.toLowerCase();
    return chats.filter(chat =>
      chat.other_opinion_text.toLowerCase().includes(query) ||
      chat.last_message?.toLowerCase().includes(query)
    );
  }, [chats, search]);

  const filteredRequests = useMemo(() => {
    if (!pendingRequests) return [];
    if (!search.trim()) return pendingRequests;
    const q = search.toLowerCase();
    return pendingRequests.filter(r => r.other_opinion_text.toLowerCase().includes(q));
  }, [pendingRequests, search]);

  const handleChatItemClick = (chat: ChatItem) => {
    const theirOpinionId = chat.opinion_a_id === myOpinion?.id ? chat.opinion_b_id : chat.opinion_a_id;
    
    if (isMobile) {
      // On mobile, open embedded chat inside sidebar
      setActiveChatOpinionId(theirOpinionId);
    } else {
      // On desktop, use floating chat
      onChatClick?.(theirOpinionId);
      if (onChatOpen) {
        onChatOpen(theirOpinionId);
      }
      if (variant === 'sheet') onOpenChange(false);
    }
  };

  const handleAcceptAndOpen = async (requestId: string, theirOpinionId: string) => {
    try {
      await acceptRequest(requestId);
      if (isMobile) {
        setActiveChatOpinionId(theirOpinionId);
      } else {
        onChatOpen?.(theirOpinionId);
        onChatClick?.(theirOpinionId);
      }
    } catch (err: any) {
      // handled by mutation
    }
  };

  const getUnreadForChat = (chat: ChatItem): number => {
    if (!unreadMessageCounts) return 0;
    const theirOpinionId = chat.opinion_a_id === myOpinion?.id ? chat.opinion_b_id : chat.opinion_a_id;
    return unreadMessageCounts.get(theirOpinionId) || 0;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return t('sidebar.yesterday', 'Yesterday');
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString();
  };

  const incomingCount = pendingRequests?.filter(r => r.direction === 'incoming').length ?? 0;

  // If an embedded chat is active on mobile, show it instead of the list
  if (activeChatOpinionId && isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveChatOpinionId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground truncate">{t('sidebar.myChats', 'Chat')}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <EmbeddedChatView theirOpinionId={activeChatOpinionId} />
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex flex-col h-full">
      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
          <span>{t('sidebar.signInToSeeChats', 'Sign in to see your chats')}</span>
          <Button
            onClick={() => onSignIn?.()}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-sm shadow-lg shadow-accent/25 px-6"
          >
            {t('common.signInOrSignUp', 'Sign In / Sign Up')}
          </Button>
        </div>
      ) : !myOpinion ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
          {t('sidebar.submitOpinionFirst', 'Submit your opinion first to start chatting')}
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('sidebar.searchChats', 'Search...')}
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

          <Tabs defaultValue="chats" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="chats" className="text-xs">
                <MessagesSquare className="w-3.5 h-3.5 mr-1" />
                {t('sidebar.myChats', 'Chats')} {chats?.length ? `(${chats.length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs relative">
                <Inbox className="w-3.5 h-3.5 mr-1" />
                {t('sidebar.requests', 'Requests')} {pendingRequests?.length ? `(${pendingRequests.length})` : ''}
                {incomingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
                    {incomingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full">
                {chatsLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{t('common.loading')}</div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    {search ? t('sidebar.noChatsFound', 'No chats found') : t('sidebar.noChatsYet', 'No chats yet')}
                  </div>
                ) : (
                  <div className="space-y-1.5 pb-4">
                    {filteredChats.map((chat) => {
                      const unread = getUnreadForChat(chat);
                      return (
                        <button
                          key={chat.id}
                          onClick={() => handleChatItemClick(chat)}
                          className="w-full text-left p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors relative"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs text-foreground line-clamp-2 flex-1">"{chat.other_opinion_text}"</p>
                            <div className="flex items-center gap-1.5">
                              {unread > 0 && (
                                <span className="min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
                                  {unread > 99 ? '99+' : unread}
                                </span>
                              )}
                              {chat.last_message_at && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(chat.last_message_at)}</span>
                              )}
                            </div>
                          </div>
                          {chat.last_message && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{chat.last_message}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full">
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{t('common.loading')}</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    {search ? t('sidebar.noRequestsFound', 'No requests found') : t('sidebar.noRequestsYet', 'No pending requests')}
                  </div>
                ) : (
                  <div className="space-y-1.5 pb-4">
                    {filteredRequests.map((req) => {
                      const theirOpinionId = req.direction === 'incoming' ? req.requester_opinion_id : req.target_opinion_id;
                      return (
                        <div
                          key={req.id}
                          className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => setExpandedRequestId(prev => prev === req.id ? null : req.id)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <span className={`inline-block text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded mb-1 ${
                                req.direction === 'incoming'
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {req.direction === 'incoming' ? t('sidebar.incoming', 'Incoming') : t('sidebar.outgoing', 'Outgoing')}
                              </span>
                              <p className="text-xs text-foreground line-clamp-2">"{req.other_opinion_text}"</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(req.created_at)}</span>
                          </div>
                          {expandedRequestId === req.id && req.direction === 'incoming' && (
                            <div className="flex gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
                              <Button size="sm" className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isAccepting || isDeclining} onClick={() => handleAcceptAndOpen(req.id, theirOpinionId)}>
                                <Check className="w-3.5 h-3.5 mr-1" />{isAccepting ? '...' : t('sidebar.accept', 'Accept')}
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-destructive text-destructive hover:bg-destructive/10" disabled={isAccepting || isDeclining} onClick={() => declineRequest(req.id)}>
                                <X className="w-3.5 h-3.5 mr-1" />{isDeclining ? '...' : t('sidebar.decline', 'Decline')}
                              </Button>
                            </div>
                          )}
                          {expandedRequestId === req.id && req.direction === 'outgoing' && (
                            <p className="text-[10px] text-muted-foreground italic mt-2">
                              {t('sidebar.waitingForAccept', 'Waiting for them to accept...')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}
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
            <MessagesSquare className="w-5 h-5" />
            {t('sidebar.myChats', 'My Chats')}
          </SheetTitle>
          <SheetDescription>{t('sidebar.yourConversations', 'Your conversations with others')}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 mt-3 flex flex-col overflow-hidden">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
