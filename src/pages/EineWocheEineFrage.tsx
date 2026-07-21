import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TTScreenInner } from '@/components/tt/TTScreen';
import { TTHeader } from '@/components/tt/TTHeader';
import { TTSideTabs, TTSideTabsHandle } from '@/components/tt/TTSideTabs';
import { TTBottomPanel } from '@/components/tt/TTBottomPanel';
import { TTNotificationsBell } from '@/components/tt/TTNotificationsBell';
import { TTCenterCTA } from '@/components/tt/TTCenterCTA';
import { TTOnboardingTour } from '@/components/tt/TTOnboardingTour';
import { PositioningTourCongrats } from '@/components/PositioningTourCongrats';
import { PositioningTourControls } from '@/components/PositioningTourControls';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTTopics, useTTSwipeWindow } from '@/hooks/useTTTopics';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useAuth } from '@/hooks/useAuth';
import { useTTNotifications } from '@/hooks/useTTNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useTTPositioningTour } from '@/hooks/useTTPositioningTour';
import { getPrefs, setPrefs } from '@/lib/tt-notification-prefs';
import { GraphEdge, GraphNode } from '@/types/graph';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { SINGLE_TOPIC_MODE } from '@/lib/single-topic';
import { TTHelpOverlay } from '@/components/tt/TTHelpOverlay';

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TT_ONBOARDING_DONE_KEY = 'tt:onboarding:first-step-done';
const TT_ONBOARDING_AUTO_OPEN_DELAY_MS = 3000;
const TT_ONBOARDING_OPINIONS_STEP = 1;
const TT_ONBOARDING_ADD_OPINION_STEP = 2;
const TT_ONBOARDING_CHAT_STEP = 3;
const TT_ONBOARDING_RATING_STEP = 4;

/**
 * TikTok-style mobile UI.
 */
export default function TT() {
  const { topicId: routeId } = useParams<{ topicId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const chatManagerRef = useRef<FloatingChatManagerHandle>(null);
  const { data: topicList = [] } = useTTTopics();
  const routeTopic = useMemo(() => {
    if (!routeId) return { id: PRIMARY_TOPIC_ID, code: null as string | null };
    if (UUID_RE.test(routeId)) {
      const topic = topicList.find((item) => item.id === routeId);
      return { id: routeId, code: topic?.short_code ?? null };
    }
    const topic = topicList.find((item) => item.short_code === routeId.toLowerCase());
    return { id: topic?.id ?? PRIMARY_TOPIC_ID, code: routeId.toLowerCase() };
  }, [routeId, topicList]);

  const initialTopicId = routeTopic.id;
  const [activeTopicId, setActiveTopicId] = useState(initialTopicId);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (routeTopic.id !== activeTopicId) {
      setActiveTopicId(routeTopic.id);
    }
  }, [routeTopic.id, activeTopicId]);

  const { topics } = useTTSwipeWindow(activeTopicId);
  const renderedTopics = useMemo(() => {
    if (topics.length <= 1) return topics.map((id) => ({ id, key: id, clone: false }));
    const first = topics[0];
    const last = topics[topics.length - 1];
    return [
      { id: last, key: `clone-start-${last}`, clone: true },
      ...topics.map((id) => ({ id, key: id, clone: false })),
      { id: first, key: `clone-end-${first}`, clone: true },
    ];
  }, [topics]);
  const renderedTopicKeys = useMemo(() => renderedTopics.map((topic) => topic.key).join('|'), [renderedTopics]);
  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreObserverRef = useRef(false);
  const sideTabsRef = useRef<TTSideTabsHandle>(null);
  // Onboarding tour disabled — kept as static no-op so downstream props stay unchanged.
  const tourOpen = false;
  const tourStep = -1;

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chatNodeId, setChatNodeId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedNode(null);
    setChatNodeId(null);
  }, [activeTopicId]);

  const { data: activeData, isLoading: activeDataLoading } = useTopicData(activeTopicId);
  const activeTopicTitle = topicList.find((topic) => topic.id === activeTopicId)?.title ?? activeData?.title ?? '...';
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
  const ownOpinionKnown = !authLoading && !activeDataLoading && (!user || !directOwnOpinionLoading);
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
    if (!ownOpinionKnown) return;
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

  const jumpToRealTopic = useCallback((id: string) => {
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-tt-real-topic="${id}"]`);
    if (!target) return;
    ignoreObserverRef.current = true;
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    requestAnimationFrame(() => {
      ignoreObserverRef.current = false;
    });
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => jumpToRealTopic(activeTopicId));
  }, [activeTopicId, renderedTopics.length, jumpToRealTopic]);

  // Re-snap on resize / visibility changes so the viewport never lands between two topics
  useEffect(() => {
    let timer: number | undefined;
    const reSnap = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => jumpToRealTopic(activeTopicId), 120);
    };
    window.addEventListener('resize', reSnap);
    document.addEventListener('visibilitychange', reSnap);
    return () => {
      window.removeEventListener('resize', reSnap);
      document.removeEventListener('visibilitychange', reSnap);
      if (timer) window.clearTimeout(timer);
    };
  }, [activeTopicId, jumpToRealTopic]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (ignoreObserverRef.current) return;
        if (best && best.intersectionRatio > 0.6) {
          const el = best.target as HTMLElement;
          const id = el.dataset.ttTopic;
          if (!id) return;
          if (el.dataset.ttClone === 'true') {
            jumpToRealTopic(id);
            return;
          }
          if (id !== activeTopicId) {
            window.dispatchEvent(new CustomEvent('tt:close-all-chats'));
            setActiveTopicId(id);
            setSelectedNode(null);
            const code = topicList.find((topic) => topic.id === id)?.short_code ?? id;
            navigate(`/${code}`, { replace: true });
          }
        }
      },
      { root, threshold: [0.6, 0.9] },
    );

    const sections = root.querySelectorAll('[data-tt-topic]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [activeTopicId, navigate, renderedTopicKeys, jumpToRealTopic, topicList]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div data-tt-phone-viewport className="relative h-[100dvh] w-full max-w-[480px] shrink-0 bg-background overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory', scrollSnapStop: 'always', scrollbarWidth: 'none', overscrollBehaviorY: 'contain', willChange: 'scroll-position' }}
        >
          {renderedTopics.map((topic, i) => (
            <TTScreenInner
              key={topic.key}
              topicId={topic.id}
              hue={(i * 47) % 360}
              isLoopClone={topic.clone}
              selectedNodeId={topic.id === activeTopicId && !topic.clone ? (selectedNode?.id ?? chatNodeId) : null}
              highlightAllNodes={false}
              onNodeSelect={(n) => {
                if (!topic.clone) setSelectedNode(n);
              }}
              onEdgeClick={topic.id === activeTopicId && !topic.clone ? handleEdgeClick : undefined}
            />
          ))}
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
          onOpenHelp={SINGLE_TOPIC_MODE ? () => setHelpOpen(true) : undefined}
          onRestartTour={() => {
            setTourStep(0);
            setTourOpen(true);
          }}
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

        {!SINGLE_TOPIC_MODE && <TTNotificationsBell topicId={activeTopicId} />}
        {SINGLE_TOPIC_MODE && helpOpen && (
          <TTHelpOverlay
            onClose={() => setHelpOpen(false)}
            opinions={activeData?.opinions ?? []}
            ownOpinionId={ownOpinionId}
          />
        )}
        {ownOpinionKnown && !hasOwnOpinion && !selectedNode && (
          <TTCenterCTA
            topicId={activeTopicId}
            topicTitle={activeTopicTitle}
            highlight={tourOpen && tourStep === TT_ONBOARDING_ADD_OPINION_STEP}
            onOpinionCommitted={() => {
              queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
              queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
            }}
          />
        )}
        {showTourSpotlightOverlay && (
          <div className="pointer-events-none absolute inset-0 z-50 bg-tt-spotlight-overlay/70" />
        )}
        <TTOnboardingTour
          open={tourOpen}
          step={tourStep}
          onNext={() => {
            if (tourStep >= TT_ONBOARDING_RATING_STEP) {
              completeTour();
              return;
            }
            setTourStep((step) => Math.min(TT_ONBOARDING_RATING_STEP, step + 1));
          }}
          onDone={completeTour}
        />
        <TTBottomPanel
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion}
          ownOpinionKnown={ownOpinionKnown}
          ownOpinionId={ownOpinionId}
          highlightAddOpinionForm={tourOpen && tourStep === TT_ONBOARDING_ADD_OPINION_STEP}
          highlightLetsChatButton={tourOpen && tourStep === TT_ONBOARDING_CHAT_STEP}
          highlightDisagreementScale={tourOpen && tourStep === TT_ONBOARDING_RATING_STEP && hasOwnOpinion}
          forceShowAddOpinionForm={tourOpen && tourStep === TT_ONBOARDING_ADD_OPINION_STEP}
          suppressHintPanel={tourOpen}
          selected={
            selectedNode
              ? { id: selectedNode.id, text: selectedNode.opinion?.text ?? '' }
              : null
          }
          onLetsChat={(targetOpinionId) => {
            if (!hasOwnOpinion) return;
            // Directly open the chat in the side panel
            sideTabsRef.current?.openChat(targetOpinionId);
            // Close the opinion panel so it doesn't overlap the chat panel.
            setSelectedNode(null);
          }}
          onOpinionSubmitted={() => setSelectedNode(null)}
          onOpinionCommitted={() => {
            queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
          }}
          onCloseSelection={() => {
            if (positioningTour.active) positioningTour.stop();
            setSelectedNode(null);
          }}
        />

        <PositioningTourCongrats
          open={positioningTour.congratsOpen}
          onStart={positioningTour.start}
        />
        {positioningTour.active && selectedNode && (
          <PositioningTourControls
            onNext={positioningTour.next}
            onStop={positioningTour.stop}
            canContinue={positioningTour.canContinue}
          />
        )}
      </div>
    </div>
  );
}
