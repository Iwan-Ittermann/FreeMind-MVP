import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TTScreenInner } from '@/components/tt/TTScreen';
import { TTHeader } from '@/components/tt/TTHeader';
import { TTSideTabs } from '@/components/tt/TTSideTabs';
import { TTBottomPanel } from '@/components/tt/TTBottomPanel';
import { TTNotificationsBell } from '@/components/tt/TTNotificationsBell';
import { useTTSwipeWindow } from '@/hooks/useTTTopics';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useAuth } from '@/hooks/useAuth';
import { GraphNode } from '@/types/graph';
import { toast } from 'sonner';

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

/**
 * TikTok-style mobile UI.
 *
 * Architecture (post-parallax refactor):
 * - **Persistent chrome** (single instance, fixed at viewport): header, side tabs,
 *   bottom panel, bell. Driven by `activeTopicId`. Never unmounts on swipe →
 *   no flash, no shake.
 * - **Scroll layer**: vertical scroll-snap container with one `TTScreenInner`
 *   per topic in the [prev, current, next] window. Each section renders only
 *   the background + graph and does its own data fetching scoped to its topicId.
 * - **Parallax**: each `TTScreenInner` translates its graph layer at a slower
 *   rate than the background as the section enters/leaves the viewport.
 * - **URL sync**: IntersectionObserver watches the sections; when one becomes
 *   most visible we update the URL (`replace`) and `activeTopicId`.
 */
export default function TT() {
  const { topicId: routeId } = useParams<{ topicId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Resolve current active topic. The route param can be a UUID or (future) a
  // url_slug — for now we accept it as-is and fall back to the primary topic.
  const initialTopicId = routeId ?? PRIMARY_TOPIC_ID;
  const [activeTopicId, setActiveTopicId] = useState(initialTopicId);

  // Keep state in sync if the route changes externally.
  useEffect(() => {
    if (routeId && routeId !== activeTopicId) {
      setActiveTopicId(routeId);
    }
  }, [routeId, activeTopicId]);

  const { topics } = useTTSwipeWindow(activeTopicId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected node for the bottom panel (resets on topic change).
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  useEffect(() => {
    setSelectedNode(null);
  }, [activeTopicId]);

  // Data for the chrome (header title, side panel lists, ownership checks).
  const { data: activeData } = useTopicData(activeTopicId);
  const { chats: ttChats, pendingRequests: ttPendingRequests } = useTTChats(activeTopicId);
  const { sendRequest, isSending, hasPendingRequest, hasAcceptedChat } = useChatRequests(activeTopicId);
  const ownOpinionId = useMemo(() => {
    if (!user || !activeData) return null;
    return activeData.opinions.find((o) => o.authorId === user.id)?.id ?? null;
  }, [user, activeData]);
  const hasOwnOpinion = !!ownOpinionId;

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

  // Scroll the active topic into view (no animation) on mount / window change
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-tt-topic="${activeTopicId}"]`);
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
  }, [activeTopicId, topics.length]);

  // IntersectionObserver: when a screen becomes the most visible, sync URL
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
        if (best && best.intersectionRatio > 0.6) {
          const id = (best.target as HTMLElement).dataset.ttTopic;
          if (id && id !== activeTopicId) {
            window.dispatchEvent(new CustomEvent('tt:close-all-chats'));
            setActiveTopicId(id);
            setSelectedNode(null);
            navigate(`/tt/${id}`, { replace: true });
          }
        }
      },
      { root, threshold: [0.6, 0.9] },
    );

    const sections = root.querySelectorAll('[data-tt-topic]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [activeTopicId, navigate, topics.join('|')]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="relative h-[100dvh] w-full max-w-[480px] bg-background overflow-hidden">
        {/* Scrollable graph layer (only this scrolls/parallaxes) */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          {topics.map((id, i) => (
            <TTScreenInner
              key={id}
              topicId={id}
              hue={(i * 47) % 360}
              selectedNodeId={id === activeTopicId ? selectedNode?.id ?? null : null}
              onNodeSelect={(n) => {
                if (id === activeTopicId) setSelectedNode(n);
              }}
            />
          ))}
        </div>

        {/* Persistent chrome — never unmounts on swipe */}
        <TTHeader topicTitle={activeData?.title ?? '...'} />
        <TTSideTabs
          opinions={activeData?.opinions ?? []}
          chats={ttChats}
          pendingRequests={ttPendingRequests}
          topicId={activeTopicId}
          onOpinionTap={(opinionId) => {
            const op = activeData?.opinions.find((o) => o.id === opinionId);
            if (op) {
              // Synthetic node — only id + opinion are used by the bottom panel.
              setSelectedNode({ id: op.id, x: 0, y: 0, opinion: op } as GraphNode);
            }
          }}
        />
        <TTNotificationsBell topicId={activeTopicId} />
        <TTBottomPanel
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion}
          ownOpinionId={ownOpinionId}
          selected={
            selectedNode
              ? { id: selectedNode.id, text: selectedNode.opinion?.text ?? '' }
              : null
          }
          onLetsChat={async (targetOpinionId) => {
            if (!ownOpinionId) return;
            if (hasAcceptedChat(ownOpinionId, targetOpinionId)) {
              // Already have a chat — open it in the sidebar
              setSide('right');
              return;
            }
            if (hasPendingRequest(ownOpinionId, targetOpinionId)) {
              toast.info('Request already sent');
              return;
            }
            try {
              await sendRequest({ requesterOpinionId: ownOpinionId, targetOpinionId });
              toast.success('Chat request sent!');
            } catch {
              toast.error('Failed to send request');
            }
          }}
          onOpinionSubmitted={() => setSelectedNode(null)}
          onCloseSelection={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}
