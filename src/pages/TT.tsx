import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { TTScreenInner } from '@/components/tt/TTScreen';
import { TTHeader } from '@/components/tt/TTHeader';
import { TTSideTabs, TTSideTabsHandle } from '@/components/tt/TTSideTabs';
import { TTBottomPanel } from '@/components/tt/TTBottomPanel';
import { TTNotificationsBell } from '@/components/tt/TTNotificationsBell';
import { TTOnboardingTour } from '@/components/tt/TTOnboardingTour';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTTopics, useTTSwipeWindow } from '@/hooks/useTTTopics';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useAuth } from '@/hooks/useAuth';
import { useTTNotifications } from '@/hooks/useTTNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { GraphNode } from '@/types/graph';

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';
const TT_ONBOARDING_DONE_KEY = 'tt:onboarding:first-step-done';
const TT_ONBOARDING_OPINIONS_STEP = 1;

/**
 * TikTok-style mobile UI.
 */
export default function TT() {
  const { topicId: routeId } = useParams<{ topicId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialTopicId = routeId ?? PRIMARY_TOPIC_ID;
  const [activeTopicId, setActiveTopicId] = useState(initialTopicId);

  useEffect(() => {
    if (routeId && routeId !== activeTopicId) {
      setActiveTopicId(routeId);
    }
  }, [routeId, activeTopicId]);

  const { topics } = useTTSwipeWindow(activeTopicId);
  const { data: topicList = [] } = useTTTopics();
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
  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreObserverRef = useRef(false);
  const [scrollHintCount, setScrollHintCount] = useState(() => Number(localStorage.getItem('tt:topic-scroll-count') || '0'));
  const showScrollHint = topics.length > 1 && scrollHintCount < 2;
  const sideTabsRef = useRef<TTSideTabsHandle>(null);
  const [tourOpen, setTourOpen] = useState(() => localStorage.getItem(TT_ONBOARDING_DONE_KEY) !== 'true');
  const [tourStep, setTourStep] = useState(0);

  const completeTour = useCallback(() => {
    localStorage.setItem(TT_ONBOARDING_DONE_KEY, 'true');
    setTourOpen(false);
  }, []);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  useEffect(() => {
    setSelectedNode(null);
  }, [activeTopicId]);

  const { data: activeData } = useTopicData(activeTopicId);
  const activeTopicTitle = topicList.find((topic) => topic.id === activeTopicId)?.title ?? activeData?.title ?? '...';
  const { chats: ttChats } = useTTChats(activeTopicId);
  const ownOpinionId = useMemo(() => {
    if (!user || !activeData) return null;
    return activeData.opinions.find((o) => o.authorId === user.id)?.id ?? null;
  }, [user, activeData]);
  const hasOwnOpinion = !!ownOpinionId;
  const { notifications: ttNotifications, markAllRead } = useTTNotifications(activeTopicId);
  const { data: unreadMap } = useUnreadMessages(activeTopicId, ownOpinionId);
  const totalUnread = useMemo(() => {
    if (!unreadMap) return 0;
    let sum = 0;
    unreadMap.forEach((v) => { sum += v; });
    return sum;
  }, [unreadMap]);

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
            navigate(`/tt/${id}`, { replace: true });
          }
        }
      },
      { root, threshold: [0.6, 0.9] },
    );

    const sections = root.querySelectorAll('[data-tt-topic]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [activeTopicId, navigate, renderedTopics.map((topic) => topic.key).join('|'), jumpToRealTopic]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="relative h-[100dvh] w-full max-w-[480px] bg-background overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', overscrollBehaviorY: 'contain', willChange: 'scroll-position' }}
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
            />
          ))}
        </div>

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
        <TTOnboardingTour
          open={tourOpen}
          step={tourStep}
          onNext={() => setTourStep((step) => Math.min(TT_ONBOARDING_OPINIONS_STEP, step + 1))}
          onDone={completeTour}
        />
        <TTBottomPanel
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion}
          ownOpinionId={ownOpinionId}
          selected={
            selectedNode
              ? { id: selectedNode.id, text: selectedNode.opinion?.text ?? '' }
              : null
          }
          onLetsChat={(targetOpinionId) => {
            // Directly open the chat in the side panel
            sideTabsRef.current?.openChat(targetOpinionId);
          }}
          onOpinionSubmitted={() => setSelectedNode(null)}
          onCloseSelection={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}
