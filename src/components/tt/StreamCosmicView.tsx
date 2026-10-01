import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Radio } from 'lucide-react';
import type { Opinion } from '@/types/graph';
import type { AllTopicChatItem } from '@/hooks/useAllTopicChats';
import type { StreamEntry } from '@/lib/stream-spiral';
import { StreamEdgeConversation } from './StreamEdgeConversation';
import { cn } from '@/lib/utils';

interface StreamCosmicViewProps {
  entry: StreamEntry;
  opinions: Opinion[];
  chats: AllTopicChatItem[];
  bestChat: AllTopicChatItem | null;
}

export function StreamCosmicView({ entry, opinions, chats, bestChat }: StreamCosmicViewProps) {
  const { t } = useTranslation();
  const opinion = opinions.find((item) => item.id === entry.nodeId);
  const [activeChatId, setActiveChatId] = useState<string | null>(bestChat?.id ?? chats[0]?.id ?? null);

  useEffect(() => {
    setActiveChatId(bestChat?.id ?? chats[0]?.id ?? null);
  }, [entry.nodeId, bestChat?.id, chats]);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0] ?? null;
  const counterpartText = useMemo(() => {
    if (!activeChat) return '';
    return activeChat.opinionAId === entry.nodeId ? activeChat.opinionBText : activeChat.opinionAText;
  }, [activeChat, entry.nodeId]);

  if (!opinion) return null;

  const nodeCount = Math.min(chats.length, 8);
  const radius = 39;

  return (
    <div className="stream-cosmic min-h-full bg-background text-foreground">
      <div className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <article className="relative flex min-h-[300px] flex-col justify-center overflow-hidden border-b border-border/40 px-6 py-10 lg:min-h-full lg:border-b-0 lg:border-r lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_42%,hsl(var(--stream-line)/0.16),transparent_38%),radial-gradient(circle_at_76%_74%,hsl(var(--stream-warm)/0.13),transparent_30%)]" />
          <div className="relative z-10">
            <div className="mb-7 flex items-center gap-2 text-[10px] font-semibold uppercase text-primary">
              <Radio className="h-3 w-3" />
              {t('tt.streamNow')}
            </div>
            <blockquote className="font-stream-editorial text-[clamp(2rem,5vw,4.75rem)] leading-[0.98] text-foreground">
              “{opinion.text}”
            </blockquote>
            <div className="mt-8 h-px w-24 bg-secondary" />
          </div>
        </article>

        <section className="relative flex min-h-[460px] flex-col overflow-hidden px-4 py-5 lg:px-6">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground">
            <span>{t('tt.streamConversations')}</span>
            <span>{chats.length}</span>
          </div>

          {chats.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t('tt.streamEmpty')}</div>
          ) : (
            <>
              <div className="relative mx-auto h-[220px] w-full max-w-[420px] shrink-0" aria-label={t('tt.streamConversations')}>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
                  {chats.slice(0, nodeCount).map((chat, index) => {
                    const angle = -Math.PI / 2 + (index / nodeCount) * Math.PI * 2;
                    const x = 50 + Math.cos(angle) * radius;
                    const y = 50 + Math.sin(angle) * radius;
                    return <line key={chat.id} x1="50" y1="50" x2={x} y2={y} className={cn('stroke-primary/35', activeChat?.id === chat.id && 'stroke-secondary')} strokeWidth={activeChat?.id === chat.id ? 1.4 : 0.8} strokeDasharray="2 2" />;
                  })}
                </svg>
                <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/70 bg-primary/15 shadow-[0_0_34px_hsl(var(--stream-line)/0.35)]">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                </div>
                {chats.slice(0, nodeCount).map((chat, index) => {
                  const angle = -Math.PI / 2 + (index / nodeCount) * Math.PI * 2;
                  const x = 50 + Math.cos(angle) * radius;
                  const y = 50 + Math.sin(angle) * radius;
                  const otherText = chat.opinionAId === entry.nodeId ? chat.opinionBText : chat.opinionAText;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setActiveChatId(chat.id)}
                      className={cn(
                        'absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        activeChat?.id === chat.id ? 'border-secondary text-secondary shadow-[0_0_20px_hsl(var(--stream-warm)/0.26)]' : 'border-primary/40 hover:border-primary hover:text-primary',
                      )}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      aria-label={`${t('tt.streamOpenConversation')}: ${otherText}`}
                      title={otherText}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>

              {activeChat && (
                <StreamEdgeConversation
                  chat={activeChat}
                  sourceOpinionId={entry.nodeId}
                  sourceUserId={opinion.authorId}
                  counterpartText={counterpartText}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}