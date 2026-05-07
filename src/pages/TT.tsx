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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTTopics, useTTSwipeWindow } from '@/hooks/useTTTopics';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useAuth } from '@/hooks/useAuth';
import { useTTNotifications } from '@/hooks/useTTNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { GraphEdge, GraphNode } from '@/types/graph';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';

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
  const [scrollHintCount, setScrollHintCount] = useState(() => Number(localStorage.getItem('tt:topic-scroll-count') || '0'));
  const showScrollHint = topics.length > 1 && scrollHintCount < 2;
  const sideTabsRef = useRef<TTSideTabsHandle>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourDemoSelectionRef = useRef<{ topicId: string; step: number; opinionId: string } | null>(null);

  useEffect(() => {
    if (localStorage.getItem(TT_ONBOARDING_DONE_KEY) === 'true') return;
    const timer = window.setTimeout(() => {
      if (localStorage.getItem(TT_ONBOARDING_DONE_KEY) !== 'true') setTourOpen(true);
    }, TT_ONBOARDING_AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TT_ONBOARDING_DONE_KEY, 'true');
    setTourOpen(false);
  }, []);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  useEffect(() => {
    tourDemoSelectionRef.current = null;
    setSelectedNode(null);
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
  useEffect(() => {
    const shouldOpenOpinionPanel = tourStep === TT_ONBOARDING_CHAT_STEP || (tourStep === TT_ONBOARDING_RATING_STEP && hasOwnOpinion);
    if (!tourOpen || !shouldOpenOpinionPanel || !activeData?.opinions.length) {
      if (!shouldOpenOpinionPanel) tourDemoSelectionRef.current = null;
      return;
    }
    const candidates = activeData.opinions.filter((opinion) => opinion.id !== ownOpinionId);
    const pool = candidates.length > 0 ? candidates : activeData.opinions;
    const existingPick = tourDemoSelectionRef.current;
    const reusableOpinion = existingPick?.topicId === activeTopicId && existingPick.step === tourStep
      ? pool.find((opinion) => opinion.id === existingPick.opinionId)
      : null;
    const randomOpinion = reusableOpinion ?? pool[Math.floor(Math.random() * pool.length)];
    if (!randomOpinion) return;
    tourDemoSelectionRef.current = { topicId: activeTopicId, step: tourStep, opinionId: randomOpinion.id };
    if (selectedNode?.id === randomOpinion.id) return;
    setSelectedNode({ id: randomOpinion.id, x: 0, y: 0, opinion: randomOpinion } as GraphNode);
  }, [tourOpen, tourStep, activeTopicId, activeData?.opinions, ownOpinionId, selectedNode?.id, hasOwnOpinion]);
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
  const showTourSpotlightOverlay = tourOpen && (
    tourStep === TT_ONBOARDING_ADD_OPINION_STEP
    || tourStep === TT_ONBOARDING_RATING_STEP
  );
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
            setScrollHintCount((count) => {
              const next = Math.min(2, count + 1);
              localStorage.setItem('tt:topic-scroll-count', String(next));
              return next;
            });
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
              selectedNodeId={topic.id === activeTopicId && !topic.clone ? selectedNode?.id ?? null : null}
              highlightAllNodes={topic.id === activeTopicId && !topic.clone && tourOpen && tourStep === TT_ONBOARDING_OPINIONS_STEP}
              onNodeSelect={(n) => {
                if (topic.id === activeTopicId && !topic.clone) setSelectedNode(n);
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
          onOpinionTap={(opinionId) => {
            const op = activeData?.opinions.find((o) => o.id === opinionId);
            if (op) {
              setSelectedNode({ id: op.id, x: 0, y: 0, opinion: op } as GraphNode);
            }
          }}
        />

        <AnimatePresence>
          {showScrollHint && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+104px)] left-1/2 z-30 -translate-x-1/2 rounded-full border border-border/40 bg-background/80 px-2.5 py-2 shadow-md backdrop-blur-md"
            >
              <div className="flex items-center justify-center text-foreground/75">
                <motion.div animate={{ y: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  <ChevronUp className="h-5 w-5" />
                  <ChevronDown className="-mt-1.5 h-5 w-5" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <TTNotificationsBell topicId={activeTopicId} />
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
          }}
          onOpinionSubmitted={() => setSelectedNode(null)}
          onOpinionCommitted={() => {
            queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
          }}
          onCloseSelection={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}
