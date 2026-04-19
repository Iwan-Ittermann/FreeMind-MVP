import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Check } from 'lucide-react';
import type { Opinion } from '@/types/graph';
import type { TTChatItem, TTPendingRequestItem } from '@/hooks/useTTChats';
import { EmbeddedChatView } from '@/components/chat/EmbeddedChatView';
import { useChatRequests } from '@/hooks/useChatRequests';
import { Button } from '@/components/ui/button';

interface TTSideTabsProps {
  opinions?: Opinion[];
  chats?: TTChatItem[];
  pendingRequests?: TTPendingRequestItem[];
  topicId: string;
  onOpinionTap?: (opinionId: string) => void;
}

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 };

export function TTSideTabs({
  opinions = [],
  chats = [],
  pendingRequests = [],
  topicId,
  onOpinionTap,
}: TTSideTabsProps) {
  const { t } = useTranslation();
  const [side, setSide] = useState<'left' | 'right' | null>(null);
  const [activeChatOpinionId, setActiveChatOpinionId] = useState<string | null>(null);
  const { acceptRequest, declineRequest, isAccepting, isDeclining } = useChatRequests(topicId);

  const closeAndRun = (fn?: () => void) => {
    setSide(null);
    fn?.();
  };

  const closeAll = () => {
    setSide(null);
    setActiveChatOpinionId(null);
  };

  const handleAcceptAndOpen = async (req: TTPendingRequestItem) => {
    try {
      await acceptRequest(req.id);
      setActiveChatOpinionId(req.theirOpinionId);
    } catch {
      /* handled in mutation */
    }
  };

  const incomingCount = pendingRequests.filter((r) => r.direction === 'incoming').length;
  const rightBadge = chats.length + incomingCount;

  return (
    <>
      {/* Left tab — top third */}
      <button
        onClick={() => setSide(side === 'left' ? null : 'left')}
        className="absolute left-0 top-[22%] z-30 h-28 w-7 rounded-r-xl bg-background/85 backdrop-blur-md border border-l-0 border-border/40 shadow-md flex items-center justify-center hover:bg-background/95 transition-colors"
        aria-label={t('tt.opinions')}
      >
        <span
          className="text-[10px] tracking-[0.2em] font-semibold text-foreground/80 uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t('tt.opinions')}
        </span>
      </button>

      {/* Right tab — bottom third */}
      <button
        onClick={() => setSide(side === 'right' ? null : 'right')}
        className="absolute right-0 bottom-[28%] z-30 h-28 w-7 rounded-l-xl bg-background/85 backdrop-blur-md border border-r-0 border-border/40 shadow-md flex items-center justify-center hover:bg-background/95 transition-colors"
        aria-label={t('tt.chats')}
      >
        <span
          className="text-[10px] tracking-[0.2em] font-semibold text-foreground/80 uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          {t('tt.chats')}
        </span>
        {rightBadge > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[16px] h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center px-1">
            {rightBadge}
          </span>
        )}
      </button>

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
                initial={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleX: 0.05, scaleY: 0.4 }}
                transition={SPRING}
                style={{ transformOrigin: '0% 50%', top: '22%', height: '60vh', maxHeight: 520 }}
                className="absolute left-7 z-30 w-[78vw] max-w-[360px] rounded-2xl bg-background/85 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden flex flex-col"
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
                style={{ transformOrigin: '100% 50%', bottom: '28%', height: '60vh', maxHeight: 520 }}
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
                    {/* Pending requests */}
                    {pendingRequests.length > 0 && (
                      <div className="px-3 py-2 border-b border-border/30">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
                          {t('sidebar.requests', 'Requests')} ({pendingRequests.length})
                        </p>
                        <ul className="space-y-1.5">
                          {pendingRequests.map((req) => (
                            <li
                              key={req.id}
                              className="p-2.5 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span
                                  className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                    req.direction === 'incoming'
                                      ? 'bg-accent text-accent-foreground'
                                      : 'bg-secondary text-secondary-foreground'
                                  }`}
                                >
                                  {req.direction === 'incoming'
                                    ? t('sidebar.incoming', 'Incoming')
                                    : t('sidebar.outgoing', 'Outgoing')}
                                </span>
                              </div>
                              <p className="text-xs text-foreground line-clamp-2">
                                "{req.opinionText}"
                              </p>
                              {req.direction === 'incoming' && (
                                <div className="flex gap-1.5 mt-2">
                                  <Button
                                    size="sm"
                                    className="flex-1 h-7 text-[11px]"
                                    disabled={isAccepting || isDeclining}
                                    onClick={() => handleAcceptAndOpen(req)}
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    {t('sidebar.accept', 'Accept')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7 text-[11px]"
                                    disabled={isAccepting || isDeclining}
                                    onClick={() => declineRequest(req.id)}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    {t('sidebar.decline', 'Decline')}
                                  </Button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Chats */}
                    {chats.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">{t('tt.chatsEmpty')}</p>
                    ) : (
                      <ul className="divide-y divide-border/30">
                        {chats.map((c) => (
                          <li key={c.id}>
                            <button
                              onClick={() => setActiveChatOpinionId(c.theirOpinionId)}
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
}
