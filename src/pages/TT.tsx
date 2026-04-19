import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { TTScreen } from '@/components/tt/TTScreen';

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

/**
 * TikTok-style mobile UI.
 * Self-contained layout: locked to mobile portrait, centered on desktop with
 * dark gutters. Vertical scroll-snap container so future siblings can become
 * swipe-loadable additional topics.
 */
export default function TT() {
  const { topicId } = useParams<{ topicId?: string }>();
  const activeTopicId = topicId ?? PRIMARY_TOPIC_ID;

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

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {/* Phone-sized frame, centered on wide screens */}
      <div
        className="relative h-[100dvh] w-full max-w-[480px] overflow-y-scroll snap-y snap-mandatory bg-background"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div className="h-[100dvh] w-full snap-start">
          <TTScreen topicId={activeTopicId} hue={0} />
        </div>
        {/* Future: additional <TTScreen topicId=... hue=... /> snap sections */}
      </div>
    </div>
  );
}
