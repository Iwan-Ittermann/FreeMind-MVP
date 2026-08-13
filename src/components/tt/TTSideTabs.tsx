import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, List, MessagesSquare, Network } from 'lucide-react';
import type { Opinion } from '@/types/graph';
import type { TTChatItem } from '@/hooks/useTTChats';
import { EmbeddedChatView } from '@/components/chat/EmbeddedChatView';

export interface TTSideTabsHandle {
  openChat: (opinionId: string) => void;
}

type TTTab = 'opinions' | 'graph' | 'chats';

interface TTSideTabsProps {
  opinions?: Opinion[];
  chats?: TTChatItem[];
  topicId: string;
  hasOwnOpinion?: boolean;
  onOpinionTap?: (opinionId: string) => void;
  unreadCount?: number;
  onActiveChatChange?: (theirOpinionId: string | null) => void;
}

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 30 };

/**
 * Bottom tab bar (Opinions | Graph | Chats) plus full-surface overlays.
 * The graph stays mounted behind the overlays so switching tabs never
 * re-runs the layout or restarts animations.
 */
export const TTSideTabs = forwardRef<TTSideTabsHandle, TTSideTabsProps>(
  function TTSideTabs(
    { opinions = [], chats = [], topicId, hasOwnOpinion = false, onOpinionTap, unreadCount = 0, onActiveChatChange },
    ref,
  ) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<TTTab>('graph');
    const [activeChatOpinionId, setActiveChatOpinionId] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      openChat(opinionId: string) {
        if (!hasOwnOpinion) return;
        setTab('chats');
        setActiveChatOpinionId(opinionId);
      },
    }), [hasOwnOpinion]);

    // Notify parent which chat (= which node) is currently open, for glow effect.
    useEffect(() => {
      const id = tab === 'chats' ? activeChatOpinionId : null;
      onActiveChatChange?.(id);
    }, [tab, activeChatOpinionId, onActiveChatChange]);

    const tabButton = (
      key: TTTab,
      label: string,
      Icon: typeof List,
      opts?: { disabled?: boolean; badge?: number; helpKey?: string },
    ) => {
      const active = tab === key;
      return (
        <button
          onClick={() => {
            if (opts?.disabled) return;
            setTab(key);
          }}
          disabled={opts?.disabled}
          data-tt-help={opts?.helpKey}
          aria-label={label}
          aria-selected={active}
          role="tab"
          title={opts?.disabled ? t('chat.submitOpinionRequired') : label}
          className={`relative flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            active ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          <Icon className="w-[18px] h-[18px]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] leading-none">
            {label}
          </span>
          {!!opts?.badge && opts.badge > 0 && (
            <span className="absolute top-1 right-[calc(50%-20px)] min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {opts.badge > 99 ? '99+' : opts.badge}
            </span>
          )}
          {active && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary" />
          )}
        </button>
      );
    };

    return (
      <>
        {/* Full-surface tab panels — between header row and tab bar */}
        <AnimatePresence>
          {tab !== 'graph' && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={SPRING}
              className="absolute top-7 bottom-[76px] inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-y border-border/30 overflow-hidden flex flex-col"
            >
              {tab === 'opinions' && (
                <>
                  <div className="px-4 py-3 border-b border-border/30">
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                      {t('tt.opinions')}
                    </h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {opinions.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">{t('tt.opinionsEmpty')}</p>
                    ) : (
                      <ul className="divide-y divide-border/30">
                        {opinions.map((op) => (
                          <li key={op.id}>
                            <button
                              onClick={() => {
                                setTab('graph');
                                onOpinionTap?.(op.id);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                            >
                              <p className="text-sm text-foreground line-clamp-3 leading-snug">
                                {op.text}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {tab === 'chats' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    {activeChatOpinionId ? (
                      <button
                        onClick={() => setActiveChatOpinionId(null)}
                        className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                        aria-label={t('common.back', 'Back')}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('sidebar.myChats', 'Chats')}</span>
                      </button>
                    ) : (
                      <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                        {t('tt.chats')}
                      </h2>
                    )}
                  </div>

                  {activeChatOpinionId ? (
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <EmbeddedChatView theirOpinionId={activeChatOpinionId} />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto">
                      {chats.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">{t('tt.chatsEmpty')}</p>
                      ) : (
                        <ul className="divide-y divide-border/30">
                          {chats.map((c) => (
                            <li key={c.id}>
                              <button
                                onClick={() => {
                                  if (!hasOwnOpinion) return;
                                  setActiveChatOpinionId(c.theirOpinionId);
                                }}
                                disabled={!hasOwnOpinion}
                                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                              >
                                <p className="text-sm text-foreground line-clamp-2 leading-snug">
                                  {c.opinionText}
                                </p>
                                {c.lastMessage && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {c.lastMessage}
                                  </p>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab bar — sits directly above the Impressum footer */}
        <div
          role="tablist"
          className="absolute bottom-7 inset-x-0 z-40 h-12 flex items-stretch border-t border-border/30 bg-background/90 backdrop-blur-md"
        >
          {tabButton('opinions', t('tt.opinions'), List, { helpKey: 'opinions-tab' })}
          {tabButton('graph', t('tt.graphTab', 'Graph'), Network)}
          {tabButton('chats', t('tt.chats'), MessagesSquare, {
            disabled: !hasOwnOpinion,
            badge: unreadCount,
            helpKey: 'chats-tab',
          })}
        </div>
      </>
    );
  },
);
