import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TTScreenInner } from '@/components/tt/TTScreen';
import { TTHeader } from '@/components/tt/TTHeader';
import { TTSideTabs, TTSideTabsHandle } from '@/components/tt/TTSideTabs';
import { TTBottomPanel } from '@/components/tt/TTBottomPanel';
import { TTCenterCTA } from '@/components/tt/TTCenterCTA';

import { useTTTopics } from '@/hooks/useTTTopics';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useAuth } from '@/hooks/useAuth';
import { useTTNotifications } from '@/hooks/useTTNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useIsVerified } from '@/hooks/useIsVerified';
import { getPrefs, setPrefs } from '@/lib/tt-notification-prefs';
import { GraphEdge, GraphNode } from '@/types/graph';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { TTHelpOverlay } from '@/components/tt/TTHelpOverlay';
import { useTranslation } from 'react-i18next';

/**
 * Single-topic mobile UI. This build is locked to the Helsinki event topic (7mm9);
 * multi-topic swipe/loop logic has been removed.
 */
export default function TT() {
  useParams<{ topicId?: string }>(); // route is /7mm9; params ignored
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const chatManagerRef = useRef<FloatingChatManagerHandle>(null);
  const { data: topicList = [], isLoading: topicLoading } = useTTTopics();
  const topic = topicList[0] ?? null;
  const activeTopicId = topic?.id ?? '';
  const activeTopicTitle = topic?.title ?? '...';

  const [helpOpen, setHelpOpen] = useState(false);
  const sideTabsRef = useRef<TTSideTabsHandle>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chatNodeId, setChatNodeId] = useState<string | null>(null);

  const { data: activeData, isLoading: activeDataLoading } = useTopicData(activeTopicId);
  const { chats: ttChats } = useTTChats(activeTopicId);

  const visibleOwnOpinionId = useMemo(() => {
    if (!user || !activeData) return null;
    return activeData.opinions.find((o) => o.authorId === user.id)?.id ?? null;
  }, [user, activeData]);
  const { data: directOwnOpinionId = null, isLoading: directOwnOpinionLoading } = useQuery({
    queryKey: ['tt-own-opinion', activeTopicId, user?.id],
    enabled: !!activeTopicId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id')
        .eq('topic_id', activeTopicId)
        .eq('user_id', user!.id)
        .eq('visible', true)
        .maybeSingle();

      if (error) throw error;
      return data?.id ?? null;
    },
  });
  const ownOpinionId = visibleOwnOpinionId ?? directOwnOpinionId;
  const hasOwnOpinion = !!ownOpinionId;
  const ownOpinionKnown =
    !authLoading && !topicLoading && !activeDataLoading && (!user || !directOwnOpinionLoading);
  const { notifications: ttNotifications, markAllRead } = useTTNotifications(activeTopicId);
  const { data: unreadMap } = useUnreadMessages(activeTopicId, ownOpinionId);
  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    if (isMobile) return;
    chatManagerRef.current?.openReadOnlyChat(edge.source, edge.target);
  }, [isMobile]);
  const totalUnread = useMemo(() => {
    if (!unreadMap) return 0;
    let sum = 0;
    unreadMap.forEach((v) => { sum += v; });
    return sum;
  }, [unreadMap]);

  // Auto-subscribe bell on first opinion
  const prevHasOwnRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ownOpinionKnown || !activeTopicId) return;
    const prev = prevHasOwnRef.current;
    prevHasOwnRef.current = hasOwnOpinion;
    if (prev === false && hasOwnOpinion) {
      if (!getPrefs(activeTopicId)?.enabled) {
        setPrefs(activeTopicId, { enabled: true });
        window.dispatchEvent(new CustomEvent('tt:subscription-changed', { detail: { topicId: activeTopicId, enabled: true } }));
      }
    }
  }, [hasOwnOpinion, ownOpinionKnown, activeTopicId]);

  // Lock viewport for this route only
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute('content') ?? '';
    meta?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1',
    );
    document.documentElement.classList.add('tt-mode');
    return () => {
      meta?.setAttribute('content', original);
      document.documentElement.classList.remove('tt-mode');
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div data-tt-phone-viewport className="relative h-[100dvh] w-full max-w-[480px] shrink-0 bg-background overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {activeTopicId && (
            <TTScreenInner
              topicId={activeTopicId}
              hue={0}
              selectedNodeId={selectedNode?.id ?? chatNodeId}
              highlightAllNodes={false}
              onNodeSelect={setSelectedNode}
              onEdgeClick={handleEdgeClick}
            />
          )}
        </div>

        <FloatingChatManager
          ref={chatManagerRef}
          topicId={activeTopicId}
          myOpinionId={ownOpinionId ?? undefined}
          unreadMessageCounts={unreadMap}
        />

        {/* Persistent chrome */}
        <TTHeader
          topicTitle={activeTopicTitle}
          notifications={ttNotifications}
          onMarkAllRead={markAllRead}
          activeTopicId={activeTopicId}
          onOpenHelp={() => setHelpOpen(true)}
        />
        <TTSideTabs
          ref={sideTabsRef}
          opinions={activeData?.opinions ?? []}
          chats={ttChats}
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion}
          unreadCount={totalUnread}
          onActiveChatChange={setChatNodeId}
          onOpinionTap={(opinionId) => {
            const op = activeData?.opinions.find((o) => o.id === opinionId);
            if (op) {
              setSelectedNode({ id: op.id, x: 0, y: 0, opinion: op } as GraphNode);
            }
          }}
        />

        {helpOpen && (
          <TTHelpOverlay
            onClose={() => setHelpOpen(false)}
            opinions={activeData?.opinions ?? []}
            ownOpinionId={ownOpinionId}
          />
        )}
        {ownOpinionKnown && !hasOwnOpinion && activeTopicId && (
          <TTCenterCTA
            topicId={activeTopicId}
            topicTitle={activeTopicTitle}
            highlight={false}
            onOpinionCommitted={() => {
              queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
              queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
            }}
          />
        )}
        <TTBottomPanel
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion}
          ownOpinionKnown={ownOpinionKnown}
          ownOpinionId={ownOpinionId}
          highlightAddOpinionForm={false}
          highlightLetsChatButton={false}
          highlightDisagreementScale={false}
          forceShowAddOpinionForm={false}
          suppressHintPanel={false}
          selected={
            selectedNode
              ? { id: selectedNode.id, text: selectedNode.opinion?.text ?? '' }
              : null
          }
          onLetsChat={(targetOpinionId) => {
            if (!hasOwnOpinion) return;
            sideTabsRef.current?.openChat(targetOpinionId);
            setSelectedNode(null);
          }}
          onOpinionSubmitted={() => setSelectedNode(null)}
          onOpinionCommitted={() => {
            queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
          }}
          onCloseSelection={() => {
            setSelectedNode(null);
          }}
        />

        {/* Impressum footer — matches the header's slim size */}
        <div className="absolute bottom-0 inset-x-0 z-40 h-7 px-3 flex items-center justify-center border-t border-border/30 bg-background/40 backdrop-blur-sm pointer-events-auto">
          <a
            href="/legal"
            className="text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors leading-none"
          >
            Impressum
          </a>
        </div>
      </div>
    </div>
  );
}
