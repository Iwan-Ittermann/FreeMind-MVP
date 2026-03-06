import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessagesSquare, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

interface ChatsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  onChatOpen?: (theirOpinionId: string) => void;
  unreadMessageCounts?: Map<string, number>;
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

export function ChatsSidebar({ open, onOpenChange, topicId, onChatOpen, unreadMessageCounts }: ChatsSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

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

  const { data: chats, isLoading } = useQuery({
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
      const { data: opinionsData, error: opinionsError } = await supabase
        .from('opinions_public')
        .select('id, text')
        .in('id', otherOpinionIds);
      if (opinionsError) throw opinionsError;

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
    enabled: open && !!myOpinion?.id,
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

  const handleChatClick = (chat: ChatItem) => {
    const theirOpinionId = chat.opinion_a_id === myOpinion?.id ? chat.opinion_b_id : chat.opinion_a_id;
    if (onChatOpen) {
      onChatOpen(theirOpinionId);
    } else {
      navigate(`/chat?their=${theirOpinionId}`);
    }
    onOpenChange(false);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessagesSquare className="w-5 h-5" />
            {t('sidebar.myChats', 'My Chats')}
          </SheetTitle>
          <SheetDescription>
            {t('sidebar.yourConversations', 'Your conversations with others')}
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t('sidebar.signInToSeeChats', 'Sign in to see your chats')}
          </div>
        ) : !myOpinion ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
            {t('sidebar.submitOpinionFirst', 'Submit your opinion first to start chatting')}
          </div>
        ) : (
          <>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sidebar.searchChats', 'Search chats...')}
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
              ) : filteredChats.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  {search ? t('sidebar.noChatsFound', 'No chats found') : t('sidebar.noChatsYet', 'No chats yet')}
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filteredChats.map((chat) => {
                    const unread = getUnreadForChat(chat);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => handleChatClick(chat)}
                        className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors relative"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm text-foreground line-clamp-2 flex-1">
                            "{chat.other_opinion_text}"
                          </p>
                          <div className="flex items-center gap-2">
                            {unread > 0 && (
                              <span className="min-w-[20px] h-[20px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                                {unread > 99 ? '99+' : unread}
                              </span>
                            )}
                            {chat.last_message_at && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatTime(chat.last_message_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        {chat.last_message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {chat.last_message}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {chats && chats.length > 0 && (
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                {filteredChats.length} {t('sidebar.of', 'of')} {chats.length} {t('sidebar.chats', 'chats')}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
