import { useState, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  List,
  MessagesSquare,
  CircleDot,
  Search,
  X,
  MessageSquare,
  Pencil,
  ArrowUpDown,
  ChevronLeft,
} from 'lucide-react';
import type { Opinion } from '@/types/graph';
import type { TTChatItem } from '@/hooks/useTTChats';
import { useMyOpinionRatings } from '@/hooks/useTTChats';
import { useEnsureChatTitles } from '@/hooks/useEnsureChatTitles';
import { EmbeddedChatView } from '@/components/chat/EmbeddedChatView';
import { TTRatingDialog } from './TTRatingDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TTSideTabsHandle {
  openChat: (opinionId: string) => void;
}

type TTTab = 'opinions' | 'graph' | 'chats';
type OpinionSort = 'difference' | 'new' | 'score';

interface TTChatListItem extends TTChatItem {
  unreadCount?: number;
}

interface TTSideTabsProps {
  opinions?: Opinion[];
  chats?: TTChatListItem[];
  topicId: string;
  hasOwnOpinion?: boolean;
  myOpinionId?: string | null;
  /** Directed bridging points per opinion. */
  nodePoints?: Map<string, number>;
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
    {
      opinions = [],
      chats = [],
      topicId,
      hasOwnOpinion = false,
      myOpinionId = null,
      nodePoints,
      onOpinionTap,
      unreadCount = 0,
      onActiveChatChange,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<TTTab>('graph');
    const [activeChatOpinionId, setActiveChatOpinionId] = useState<string | null>(null);
    const [chatSearch, setChatSearch] = useState('');
    const [opinionSearch, setOpinionSearch] = useState('');
    const [opinionSort, setOpinionSort] = useState<OpinionSort>('difference');
    const [ratingTarget, setRatingTarget] = useState<{ id: string; text: string } | null>(null);
    const [expandedOpinionId, setExpandedOpinionId] = useState<string | null>(null);

    const { data: myRatings } = useMyOpinionRatings(topicId, myOpinionId);
    useEnsureChatTitles(chats, ['ttChats', topicId, myOpinionId]);

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

    const chatTitleFor = (c: TTChatListItem) =>
      c.title?.trim() || c.opinionText.split(/\s+/).slice(0, 6).join(' ');

    const filteredChats = useMemo(() => {
      const q = chatSearch.trim().toLowerCase();
      if (!q) return chats;
      return chats.filter((c) =>
        [c.title ?? '', c.opinionText, c.lastMessage ?? '', c.draft ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }, [chats, chatSearch]);

    const startedOpinionIds = useMemo(
      () => new Set(chats.filter((c) => c.started).map((c) => c.theirOpinionId)),
      [chats],
    );

    const visibleOpinions = useMemo(() => {
      const q = opinionSearch.trim().toLowerCase();
      let list = opinions.filter((op) => op.id !== myOpinionId);
      if (q) list = list.filter((op) => op.text.toLowerCase().includes(q));
      const sorted = [...list];
      sorted.sort((a, b) => {
        if (opinionSort === 'difference') {
          const ra = myRatings?.get(a.id);
          const rb = myRatings?.get(b.id);
          if (ra == null && rb == null) return a.id.localeCompare(b.id);
          if (ra == null) return 1;
          if (rb == null) return -1;
          if (rb !== ra) return rb - ra;
          return a.id.localeCompare(b.id);
        }
        if (opinionSort === 'new') {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (tb !== ta) return tb - ta;
          return a.id.localeCompare(b.id);
        }
        const pa = nodePoints?.get(a.id) ?? 0;
        const pb = nodePoints?.get(b.id) ?? 0;
        if (pb !== pa) return pb - pa;
        return a.id.localeCompare(b.id);
      });
      return sorted;
    }, [opinions, opinionSearch, opinionSort, myRatings, nodePoints, myOpinionId]);

    const sortLabel: Record<OpinionSort, string> = {
      difference: t('tt.sortDifference', 'Unterschied'),
      new: t('tt.sortNewest', 'Neueste'),
      score: t('tt.sortScore', 'Punkte'),
    };

    const searchField = (value: string, onChange: (v: string) => void, placeholder: string) => (
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8 h-8 text-xs"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t('common.clear', 'Clear')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );

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
                  <div className="px-4 py-2.5 border-b border-border/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                        {t('tt.opinions')}
                      </h2>
                      <button
                        onClick={() =>
                          setOpinionSort((s) =>
                            s === 'difference' ? 'new' : s === 'new' ? 'score' : 'difference',
                          )
                        }
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        {sortLabel[opinionSort]}
                      </button>
                    </div>
                    {searchField(opinionSearch, setOpinionSearch, t('sidebar.searchOpinions', 'Suchen…'))}
                  </div>
                  <div className="flex-1 overflow-auto">
                    {visibleOpinions.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">{t('tt.opinionsEmpty')}</p>
                    ) : (
                      <ul className="divide-y divide-border/30">
                        {visibleOpinions.map((op) => {
                          const rating = myRatings?.get(op.id);
                          const rated = rating != null;
                          const points = nodePoints?.get(op.id) ?? 0;
                          const started = startedOpinionIds.has(op.id);
                          return (
                            <li key={op.id} className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={() => {
                                    if (!rated && hasOwnOpinion) {
                                      setRatingTarget({ id: op.id, text: op.text });
                                    }
                                  }}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p
                                    className={cn(
                                      'text-sm text-foreground leading-snug',
                                      expandedOpinionId === op.id ? '' : 'line-clamp-1',
                                    )}
                                  >
                                    {op.text}
                                  </p>
                                </button>
                                <button
                                  onClick={() =>
                                    setExpandedOpinionId((cur) => (cur === op.id ? null : op.id))
                                  }
                                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                                  aria-label={t('tt.expandOpinion', 'Meinung anzeigen')}
                                >
                                  <ChevronLeft
                                    className={cn(
                                      'h-3.5 w-3.5 transition-transform',
                                      expandedOpinionId === op.id && '-rotate-90',
                                    )}
                                  />
                                </button>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                                  {t('tt.pointsShort', 'Punkte')}: {Math.round(points)}
                                </span>
                                {rated ? (
                                  <>
                                    <button
                                      onClick={() => setRatingTarget({ id: op.id, text: op.text })}
                                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      {rating}/10 {t('tt.differenceShort', 'Unterschied')}
                                    </button>
                                    <Button
                                      size="sm"
                                      variant={started ? 'default' : 'outline'}
                                      className="ml-auto h-7 rounded-full text-[11px] px-3"
                                      disabled={!hasOwnOpinion}
                                      onClick={() => {
                                        setTab('chats');
                                        setActiveChatOpinionId(op.id);
                                      }}
                                    >
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      {started
                                        ? t('tt.openChat', 'Chat öffnen')
                                        : t('tt.letsChat', 'Diskutieren')}
                                    </Button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (!hasOwnOpinion) return;
                                      setRatingTarget({ id: op.id, text: op.text });
                                    }}
                                    disabled={!hasOwnOpinion}
                                    className="ml-auto text-[11px] px-3 h-7 rounded-full border border-border/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                                  >
                                    {t('tt.rateNow', 'Bewerten')}
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
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
                    <>
                      <div className="px-4 py-2 border-b border-border/30">
                        {searchField(chatSearch, setChatSearch, t('tt.searchChats', 'Chats suchen…'))}
                      </div>
                      <div className="flex-1 overflow-auto">
                        {filteredChats.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4">{t('tt.chatsEmpty')}</p>
                        ) : (
                          <ul className="divide-y divide-border/30">
                            {filteredChats.map((c) => (
                              <li key={c.id}>
                                <button
                                  onClick={() => {
                                    if (!hasOwnOpinion) return;
                                    setActiveChatOpinionId(c.theirOpinionId);
                                  }}
                                  disabled={!hasOwnOpinion}
                                  className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-foreground line-clamp-1">
                                        {chatTitleFor(c)}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {c.opinionText}
                                      </p>
                                      {c.draft ? (
                                        <p className="text-xs text-primary mt-1 line-clamp-1">
                                          {t('tt.draft', 'Entwurf')}: {c.draft}
                                        </p>
                                      ) : c.lastMessage ? (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                          {c.lastMessage}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      {!!c.unreadCount && c.unreadCount > 0 && (
                                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                        </span>
                                      )}
                                      {!c.started && (
                                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent whitespace-nowrap">
                                          {t('tt.notStarted', 'Noch nicht begonnen')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <TTRatingDialog
          open={!!ratingTarget}
          onOpenChange={(open) => {
            if (!open) setRatingTarget(null);
          }}
          topicId={topicId}
          myOpinionId={myOpinionId}
          target={ratingTarget}
        />

        {/* Tab bar — sits directly above the Impressum footer */}
        <div
          role="tablist"
          className="absolute bottom-7 inset-x-0 z-40 h-12 flex items-stretch border-t border-border/30 bg-background/90 backdrop-blur-md"
        >
          {tabButton('opinions', t('tt.opinions'), List, { helpKey: 'opinions-tab' })}
          {tabButton('graph', t('tt.graphTab', 'Kreis'), CircleDot)}
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
