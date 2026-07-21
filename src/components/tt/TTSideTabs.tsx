import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import type { Opinion } from '@/types/graph';
import type { TTChatItem } from '@/hooks/useTTChats';
import { EmbeddedChatView } from '@/components/chat/EmbeddedChatView';

export interface TTSideTabsHandle {
  openChat: (opinionId: string) => void;
}

interface TTSideTabsProps {
  opinions?: Opinion[];
  chats?: TTChatItem[];
  topicId: string;
  hasOwnOpinion?: boolean;
  onOpinionTap?: (opinionId: string) => void;
  unreadCount?: number;
  onActiveChatChange?: (theirOpinionId: string | null) => void;
}

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 };

export const TTSideTabs = forwardRef<TTSideTabsHandle, TTSideTabsProps>(
  function TTSideTabs(
    { opinions = [], chats = [], topicId, hasOwnOpinion = false, onOpinionTap, unreadCount = 0, onActiveChatChange },
    ref,
  ) {
    const { t } = useTranslation();
    const [side, setSide] = useState<'left' | 'right' | null>(null);
    const [activeChatOpinionId, setActiveChatOpinionId] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      openChat(opinionId: string) {
        if (!hasOwnOpinion) return;
        setSide('right');
        setActiveChatOpinionId(opinionId);
      },
    }), [hasOwnOpinion]);

    // Notify parent which chat (= which node) is currently open, for glow effect.
    useEffect(() => {
      const id = side === 'right' ? activeChatOpinionId : null;
      onActiveChatChange?.(id);
    }, [side, activeChatOpinionId, onActiveChatChange]);

    const closeAndRun = (fn?: () => void) => {
      setSide(null);
      fn?.();
    };

    const closeAll = () => {
      setSide(null);
      setActiveChatOpinionId(null);
    };

    return (
      <>
        {/* Bottom pill buttons — sit just above the footer */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setSide(side === 'left' ? null : 'left')}
            data-tt-help="opinions-tab"
            className="pointer-events-auto h-9 px-4 rounded-full bg-background/85 backdrop-blur-md border border-border/40 shadow-md text-[11px] tracking-[0.18em] font-semibold text-foreground/80 uppercase hover:bg-background/95 transition-colors"
            aria-label={t('tt.opinions')}
          >
            {t('tt.opinions')}
          </button>

          <button
            onClick={() => {
              if (!hasOwnOpinion) return;
              setSide(side === 'right' ? null : 'right');
            }}
            disabled={!hasOwnOpinion}
            data-tt-help="chats-tab"
            className="pointer-events-auto relative h-9 px-4 rounded-full bg-background/85 backdrop-blur-md border border-border/40 shadow-md text-[11px] tracking-[0.18em] font-semibold text-foreground/80 uppercase hover:bg-background/95 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={t('tt.chats')}
            title={!hasOwnOpinion ? t('chat.submitOpinionRequired') : t('tt.chats')}
          >
            {t('tt.chats')}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Backdrop + animated panels */}
        <AnimatePresence>
          {side && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={closeAll}
                className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[2px]"
              />

              {side === 'left' && (
                <motion.div
                  key="panel-left"
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: 20 }}
                  transition={SPRING}
                  style={{ transformOrigin: '50% 100%', height: '60vh', maxHeight: 520 }}
                  className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 w-[86vw] max-w-[360px] rounded-2xl bg-background/85 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                      {t('tt.opinions')}
                    </h2>
                    <button
                      onClick={() => setSide(null)}
                      className="p-1 rounded-full hover:bg-muted transition-colors"
                      aria-label={t('common.close')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {opinions.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">{t('tt.opinionsEmpty')}</p>
                    ) : (
                      <ul className="divide-y divide-border/30">
                        {opinions.map((op) => (
                          <li key={op.id}>
                            <button
                              onClick={() => closeAndRun(() => onOpinionTap?.(op.id))}
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
                </motion.div>
              )}

              {side === 'right' && (
                <motion.div
                  key="panel-right"
                  initial={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                  transition={SPRING}
                  style={{ transformOrigin: '100% 50%', top: 'calc(45% - min(30vh, 260px))', height: '60vh', maxHeight: 520 }}
                  className="absolute right-7 z-30 w-[78vw] max-w-[360px] rounded-2xl bg-background/85 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* Header */}
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
                    <button
                      onClick={closeAll}
                      className="p-1 rounded-full hover:bg-muted transition-colors"
                      aria-label={t('common.close')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Body */}
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
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </>
    );
  },
);
