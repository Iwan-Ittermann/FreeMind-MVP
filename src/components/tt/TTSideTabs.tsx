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
import { useAllTopicChats, type AllTopicChatItem } from '@/hooks/useAllTopicChats';
import { useStreamFocus } from '@/hooks/useStreamFocus';
import { EmbeddedChatView } from '@/components/chat/EmbeddedChatView';
import { StreamCosmicView } from './StreamCosmicView';
import { TTRatingDialog } from './TTRatingDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReadOnlyTopic } from '@/contexts/ReadOnlyContext';

export interface TTSideTabsHandle {
  openChat: (opinionId: string) => void;
  openPanel: (panel: 'opinions' | 'stream' | 'chats') => void;
}


type TTTab = 'opinions' | 'graph' | 'stream' | 'chats';
type ChatScope = 'mine' | 'all';
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
  /** Fired when the user opens the opinion or chat list (used to close the tour). */
  onPanelOpen?: () => void;
  onStreamActiveChange?: (active: boolean) => void;
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
      onPanelOpen,
      onStreamActiveChange,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const readOnly = useReadOnlyTopic();
    const [tab, setTab] = useState<TTTab>('graph');
    const [chatScope, setChatScope] = useState<ChatScope>(readOnly ? 'all' : 'mine');
    const [activeChatOpinionId, setActiveChatOpinionId] = useState<string | null>(null);
    const [activeAllChat, setActiveAllChat] = useState<AllTopicChatItem | null>(null);
    const [chatSearch, setChatSearch] = useState('');
    const [opinionSearch, setOpinionSearch] = useState('');
    const [opinionSort, setOpinionSort] = useState<OpinionSort>('difference');
    const [ratingTarget, setRatingTarget] = useState<{ id: string; text: string } | null>(null);
    const [expandedOpinionId, setExpandedOpinionId] = useState<string | null>(null);

    const { data: myRatings } = useMyOpinionRatings(topicId, myOpinionId);
    const { data: allChats = [] } = useAllTopicChats(topicId, tab === 'chats' && chatScope === 'all');
    const stream = useStreamFocus(topicId);
    const [selectedStreamIndex, setSelectedStreamIndex] = useState<number | null>(null);

    const opinionTextById = useMemo(
      () => new Map(opinions.map((o) => [o.id, o.text])),
      [opinions],
    );

    const formatCountdown = (ms: number) => {
      const totalSec = Math.max(0, Math.ceil(ms / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
    };

    useImperativeHandle(ref, () => ({
      openChat(opinionId: string) {
        if (!hasOwnOpinion) return;
        setTab('chats');
        setChatScope('mine');
        setActiveAllChat(null);
        setActiveChatOpinionId(opinionId);
      },
      openPanel(panel: 'opinions' | 'stream' | 'chats') {
        setActiveAllChat(null);
        setActiveChatOpinionId(null);
        if (panel === 'chats') setChatScope(readOnly ? 'all' : 'mine');
        setTab(panel);
        onPanelOpen?.();
      },

    }), [hasOwnOpinion, onPanelOpen, readOnly]);

    // Notify parent which chat (= which node) is currently open, for glow effect.
    useEffect(() => {
      const id = tab === 'chats' && chatScope === 'mine' ? activeChatOpinionId : null;
      onActiveChatChange?.(id);
    }, [tab, chatScope, activeChatOpinionId, onActiveChatChange]);

    useEffect(() => {
      onStreamActiveChange?.(tab === 'stream');
      return () => onStreamActiveChange?.(false);
    }, [tab, onStreamActiveChange]);

    const selectedStreamEntry = useMemo(() => {
      if (selectedStreamIndex == null) return stream.current;
      return stream.entries.find((entry) => entry.index === selectedStreamIndex) ?? stream.current;
    }, [selectedStreamIndex, stream]);

    const upcomingStreamEntries = useMemo(
      () => stream.entries.filter((entry) => entry.index > stream.currentIndex).slice(0, 3),
      [stream.currentIndex, stream.entries],
    );


    const filteredChats = useMemo(() => {
      const q = chatSearch.trim().toLowerCase();
      if (!q) return chats;
      return chats.filter((c) =>
        [c.opinionText, c.lastMessage ?? '', c.draft ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }, [chats, chatSearch]);

    const filteredAllChats = useMemo(() => {
      const q = chatSearch.trim().toLowerCase();
      if (!q) return allChats;
      return allChats.filter((c) =>
        [c.opinionAText, c.opinionBText, c.lastMessage ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }, [allChats, chatSearch]);


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
            // Tapping the chats tab (usually triggered by an unread badge) always
            // lands on the "my chats" list — never on the read-only all-chats
            // view and never inside a chat that is already open.
            if (key === 'chats') {
              setChatScope('mine');
              setActiveAllChat(null);
              setActiveChatOpinionId(null);
            }
            setTab(key);
            if (key !== 'graph') onPanelOpen?.();
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
              className={cn(
                'absolute top-7 bottom-[81px] inset-x-0 z-30 border-y border-border/30 overflow-hidden flex flex-col',
                tab === 'stream' ? 'stream-cosmic bg-background' : 'bg-background/95 backdrop-blur-xl',
              )}
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
                                {rated ? (
                                  <>
                                    <button
                                      onClick={() => setRatingTarget({ id: op.id, text: op.text })}
                                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      <span>{t('tt.differenceShort', 'Unterschied')}</span>
                                      <span className="relative h-[3px] w-16 rounded-full bg-foreground/15">
                                        <span
                                          className="absolute inset-y-0 left-0 rounded-full bg-primary"
                                          style={{ width: `${(Number(rating) / 10) * 100}%` }}
                                        />
                                      </span>
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
                                        : t('tt.startChat', 'Chat starten')}
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

              {tab === 'stream' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground/80">
                      {t('tt.streamTab', 'Stream')}
                    </h2>
                    {stream.n > 0 && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {t('tt.streamNextIn', 'Nächster in')} {formatCountdown(stream.countdownMs)}
                      </span>
                    )}
                  </div>

                  {stream.n === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">
                      {t('tt.streamEmpty', 'Noch keine Gespräche für den Stream.')}
                    </p>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-auto">
                      {selectedStreamEntry && (
                        <StreamCosmicView
                          entry={selectedStreamEntry}
                          opinions={opinions}
                          chats={stream.chatsFor(selectedStreamEntry.nodeId)}
                          bestChat={stream.bestChatFor(selectedStreamEntry.nodeId)}
                        />
                      )}

                      {upcomingStreamEntries.length > 0 && (
                        <div className="border-t border-border/40 px-4 py-4">
                          <div className="mb-2 text-[10px] font-semibold uppercase text-primary">
                            {t('tt.streamPreview', 'Als Nächstes')}
                          </div>
                          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {upcomingStreamEntries.map((entry, index) => (
                              <li key={entry.index}>
                                <Button
                                  variant="outline"
                                  onClick={() => setSelectedStreamIndex(entry.index)}
                                  className={cn(
                                    'h-full min-h-20 w-full items-start justify-start rounded-md px-3 py-2 text-left',
                                    selectedStreamEntry?.index === entry.index && 'border-secondary bg-secondary/10',
                                  )}
                                >
                                  <span className="min-w-0 whitespace-normal">
                                    <span className="mb-1 block text-[9px] font-semibold uppercase text-muted-foreground">
                                      {t('tt.streamPreviewItem', 'Danach {{number}}', { number: index + 1 })}
                                    </span>
                                    <span className="font-stream-editorial line-clamp-3 text-base leading-tight text-foreground">
                                      {opinionTextById.get(entry.nodeId) ?? ''}
                                    </span>
                                  </span>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {stream.entries.filter((e) => e.index < stream.currentIndex).length > 0 && (
                        <div className="border-t border-border/40 px-4 py-4">
                          <div className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
                            {t('tt.streamHistory', 'Verlauf')}
                          </div>
                          <ul className="flex gap-2 overflow-x-auto pb-1">
                            {stream.entries
                              .filter((e) => e.index < stream.currentIndex)
                              .map((e) => {
                                return (
                                  <li key={e.index} className="shrink-0">
                                    <button
                                      onClick={() => setSelectedStreamIndex(e.index)}
                                      className={cn(
                                        'w-48 rounded-md border px-3 py-2 text-left transition-colors',
                                        selectedStreamEntry?.index === e.index
                                          ? 'border-secondary bg-secondary/10'
                                          : 'border-border/60 hover:border-primary/60',
                                      )}
                                    >
                                      <p className="font-stream-editorial line-clamp-2 text-base leading-tight text-foreground">
                                        {opinionTextById.get(e.nodeId) ?? ''}
                                      </p>
                                    </button>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {tab === 'chats' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    {activeChatOpinionId || activeAllChat ? (
                      <button
                        onClick={() => {
                          setActiveChatOpinionId(null);
                          setActiveAllChat(null);
                        }}
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

                  {activeAllChat ? (
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <EmbeddedChatView
                        theirOpinionId={activeAllChat.opinionBId}
                        readOnly
                        sourceOpinionId={activeAllChat.opinionAId}
                      />
                    </div>
                  ) : activeChatOpinionId ? (
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <EmbeddedChatView theirOpinionId={activeChatOpinionId} />
                    </div>
                  ) : (
                    <>
                      {/* Scope switch: my chats vs. all chats (read-only) */}
                      <div className="px-4 pt-2">
                        <div className="flex rounded-full bg-muted/60 p-0.5">
                          {(['mine', 'all'] as const).map((scope) => (
                            <button
                              key={scope}
                              onClick={() => setChatScope(scope)}
                              className={cn(
                                'flex-1 h-7 rounded-full text-[11px] font-semibold transition-colors',
                                chatScope === scope
                                  ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/40'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {scope === 'mine'
                                ? t('tt.myChats', 'Meine Chats')
                                : t('tt.allChats', 'Alle Chats')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="px-4 py-2 border-b border-border/30">
                        {searchField(chatSearch, setChatSearch, t('tt.searchChats', 'Chats suchen…'))}
                      </div>
                      <div className="flex-1 overflow-auto">
                        {chatScope === 'all' ? (
                          filteredAllChats.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4">
                              {t('tt.allChatsEmpty', 'Noch keine Gespräche.')}
                            </p>
                          ) : (
                            <ul className="divide-y divide-border/30">
                              {filteredAllChats.map((c) => (
                                <li key={c.id}>
                                  <button
                                    onClick={() => setActiveAllChat(c)}
                                    className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground line-clamp-1">
                                          {c.opinionAText} ↔ {c.opinionBText}
                                        </p>
                                        {c.lastMessage && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {c.lastMessage}
                                          </p>
                                        )}
                                      </div>
                                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                                        {c.messageCount}
                                      </span>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )
                        ) : filteredChats.length === 0 ? (
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

        {/* Three primary tabs; secondary destinations live in the settings menu. */}
        <div
          role="tablist"
          className="absolute bottom-0 inset-x-0 z-40 h-12 flex items-stretch border-t border-border/30 bg-background/90 backdrop-blur-md"
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
