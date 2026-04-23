import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TTScreenInner } from '@/components/tt/TTScreen';
import { TTHeader } from '@/components/tt/TTHeader';
import { TTSideTabs, TTSideTabsHandle } from '@/components/tt/TTSideTabs';
import { TTBottomPanel } from '@/components/tt/TTBottomPanel';
import { TTNotificationsBell } from '@/components/tt/TTNotificationsBell';
import { useTTSwipeWindow } from '@/hooks/useTTTopics';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useAuth } from '@/hooks/useAuth';
import { useTTNotifications } from '@/hooks/useTTNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { GraphNode } from '@/types/graph';

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const sideTabsRef = useRef<TTSideTabsHandle>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  useEffect(() => {
    setSelectedNode(null);
  }, [activeTopicId]);

  const { data: activeData } = useTopicData(activeTopicId);
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

        {/* Persistent chrome */}
        <TTHeader
          topicTitle={activeData?.title ?? '...'}
          notifications={ttNotifications}
          onMarkAllRead={markAllRead}
        />
        <TTSideTabs
          ref={sideTabsRef}
          opinions={activeData?.opinions ?? []}
          chats={ttChats}
          topicId={activeTopicId}
          onOpinionTap={(opinionId) => {
            const op = activeData?.opinions.find((o) => o.id === opinionId);
            if (op) {
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
