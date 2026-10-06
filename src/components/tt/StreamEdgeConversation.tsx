import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation, ConversationContent, ConversationEmptyState } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useChatMessages } from '@/hooks/useChatMessages';
import type { AllTopicChatItem } from '@/hooks/useAllTopicChats';

interface StreamEdgeConversationProps {
  chat: AllTopicChatItem;
  sourceOpinionId: string;
  sourceUserId?: string | null;
  counterpartText: string;
}

export function StreamEdgeConversation({ chat, sourceOpinionId, sourceUserId, counterpartText }: StreamEdgeConversationProps) {
  const { t } = useTranslation();
  const targetOpinionId = chat.opinionAId === sourceOpinionId ? chat.opinionBId : chat.opinionAId;
  const { messages, isLoading } = useChatMessages(null, false, undefined, {
    sourceOpinionId,
    targetOpinionId,
    sourceUserId,
  });
  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

  return (
    <div className="relative flex min-h-0 flex-col">
      <Conversation className="h-[220px] max-h-[220px] min-h-0 flex-none rounded-md border border-primary/25 bg-card/45 shadow-[0_0_32px_hsl(var(--stream-line)/0.08)]">
        <ConversationContent className="gap-3 p-3">
          {!isLoading && visibleMessages.length === 0 ? (
            <ConversationEmptyState className="min-h-[180px] p-4" description={t('tt.streamConversationEmpty')} />
          ) : (
            visibleMessages.map((message) => (
              <Message key={message.id} from={message.isOwn ? 'user' : 'assistant'} className="max-w-[92%] gap-0">
                <MessageContent className={message.isOwn
                  ? 'rounded-md bg-primary px-3 py-2 text-primary-foreground'
                  : 'px-1 py-1 text-foreground'}
                >
                  <MessageResponse className="text-xs leading-relaxed">{message.transcript || message.content}</MessageResponse>
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
      </Conversation>
      <div className="mx-auto mt-2 max-w-[94%] rounded-full border border-secondary/45 bg-secondary/10 px-3 py-1.5 text-center text-[11px] text-foreground">
        <span className="mr-1.5 text-[9px] font-semibold uppercase text-secondary">{t('tt.streamCounterpart')}</span>
        <span className="line-clamp-2">{counterpartText}</span>
      </div>
    </div>
  );
}