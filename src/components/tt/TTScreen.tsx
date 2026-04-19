import { useState, useMemo } from 'react';
import { useTopicData } from '@/hooks/useTopicData';
import { useAuth } from '@/hooks/useAuth';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { TTBackground } from './TTBackground';
import { TTHeader } from './TTHeader';
import { TTSideTabs } from './TTSideTabs';
import { TTBottomPanel } from './TTBottomPanel';
import { TTNotificationsBell } from './TTNotificationsBell';
import { useTranslation } from 'react-i18next';
import { GraphNode } from '@/types/graph';

interface TTScreenProps {
  topicId: string;
  hue?: number;
  videoUrl?: string | null;
}

export function TTScreen({ topicId, hue = 0, videoUrl }: TTScreenProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, activeChats, messageAnimations } = useTopicData(topicId);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const ownOpinionId = useMemo(() => {
    if (!user || !data) return null;
    return data.opinions.find((o) => o.authorId === user.id)?.id ?? null;
  }, [user, data]);

  const hasOwnOpinion = !!ownOpinionId;

  // The graph is sized to fit inside the moderate ring (~52% of viewport width)
  // viewport min dimension drives diameter
  return (
    <section
      className="relative w-full h-full overflow-hidden bg-black"
      style={{ scrollSnapAlign: 'start' }}
    >
      <TTBackground hue={hue} />

      {/* Graph overlay — centered, sized to inner zone */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto" style={{ width: '85vmin', height: '85vmin', maxWidth: 480, maxHeight: 480 }}>
          <OpinionGraph
            opinions={data?.opinions ?? []}
            ratings={data?.ratings ?? []}
            activeChats={activeChats}
            messageAnimations={messageAnimations}
            currentUserId={user?.id}
            currentUserOpinionId={ownOpinionId}
            onNodeSelect={setSelectedNode}
            selectedNodeId={selectedNode?.id ?? null}
            width={480}
            height={480}
            showLabels="none"
          />
        </div>
      </div>

      {/* Zone labels (decorative, not covered by graph) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[85vmin] h-[85vmin] max-w-[480px] max-h-[480px]">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/70 font-medium">
            {t('tt.respectful')}
          </span>
          <span className="absolute left-1/2 top-[18%] -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-medium">
            {t('tt.moderate')}
          </span>
          <span className="absolute left-1/2 bottom-[2%] -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-foreground/30 font-medium">
            {t('tt.extreme')}
          </span>
        </div>
      </div>

      <TTHeader topicTitle={data?.title ?? '...'} videoUrl={videoUrl} />
      <TTSideTabs />
      <TTNotificationsBell />

      <TTBottomPanel
        topicId={topicId}
        hasOwnOpinion={hasOwnOpinion}
        ownOpinionId={ownOpinionId}
        selected={selectedNode ? { id: selectedNode.id, text: selectedNode.opinion?.text ?? '' } : null}
        onLetsChat={() => {
          // Hook up later — for now show a toast via event bus
          window.dispatchEvent(new CustomEvent('tt:lets-chat', { detail: { selected: selectedNode } }));
        }}
        onReport={() => {
          window.dispatchEvent(new CustomEvent('tt:report', { detail: { selected: selectedNode } }));
        }}
        onOpinionSubmitted={() => setSelectedNode(null)}
      />
    </section>
  );
}
