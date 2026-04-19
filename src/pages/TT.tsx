import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { TTScreen } from '@/components/tt/TTScreen';
import { useTTSwipeWindow } from '@/hooks/useTTTopics';

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

/**
 * TikTok-style mobile UI — vertical swipe between topics.
 * Renders [prev, current, next] as scroll-snap sections.
 * IntersectionObserver updates URL as user swipes.
 */
export default function TT() {
  const { topicId } = useParams<{ topicId?: string }>();
  const navigate = useNavigate();
  const activeTopicId = topicId ?? PRIMARY_TOPIC_ID;
  const { topics } = useTTSwipeWindow(activeTopicId);

  const containerRef = useRef<HTMLDivElement>(null);

  // Lock viewport for this route only
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute('content') ?? '';
    meta?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1'
    );
    document.documentElement.classList.add('tt-mode');
    return () => {
      meta?.setAttribute('content', original);
      document.documentElement.classList.remove('tt-mode');
    };
  }, []);

  // On mount or when window changes, scroll the active topic into view (without animation)
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-tt-topic="${activeTopicId}"]`);
    if (target) {
      // Defer to ensure layout measured
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
        // Pick the entry with highest intersectionRatio that is intersecting
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best && best.intersectionRatio > 0.6) {
          const id = (best.target as HTMLElement).dataset.ttTopic;
          if (id && id !== activeTopicId) {
            // Close any open floating chat windows on topic change
            window.dispatchEvent(new CustomEvent('tt:close-all-chats'));
            navigate(`/tt/${id}`, { replace: true });
          }
        }
      },
      { root, threshold: [0.6, 0.9] }
    );

    const sections = root.querySelectorAll('[data-tt-topic]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [activeTopicId, navigate, topics.join('|')]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div
        ref={containerRef}
        className="relative h-[100dvh] w-full max-w-[480px] overflow-y-scroll snap-y snap-mandatory bg-background"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
      >
        {topics.map((id, i) => (
          <div
            key={id}
            data-tt-topic={id}
            className="h-[100dvh] w-full snap-start"
          >
            <TTScreen topicId={id} hue={(i * 47) % 360} />
          </div>
        ))}
      </div>
    </div>
  );
}
