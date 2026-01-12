import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { InfoPanel } from '@/components/InfoPanel';
import { SubmitOpinion } from '@/components/SubmitOpinion';
import { GraphNode } from '@/types/graph';
import { useTopicData } from '@/hooks/useTopicData';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

const Index = () => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 600, height: 600 });
  const queryClient = useQueryClient();
  
  const { data: topicData, isLoading, error } = useTopicData(DEFAULT_TOPIC_ID);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      const isMobile = window.innerWidth < 768;
      const size = isMobile 
        ? Math.min(window.innerWidth - 32, 400)
        : Math.min(window.innerHeight - 100, 600);
      setGraphSize({ width: size, height: size });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleOpinionSubmitted = () => {
    // Refresh the topic data to show the new opinion
    queryClient.invalidateQueries({ queryKey: ['topic', DEFAULT_TOPIC_ID] });
  };

  // Use mock data if no real data exists yet
  const hasRealData = topicData && topicData.opinions.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-16">
          {/* Left panel - Info */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 max-w-md lg:pt-12"
          >
            <InfoPanel 
              question={topicData?.title || "What should be done about climate change?"}
              opinionCount={hasRealData ? topicData.opinions.length : 40}
            />
            
            {/* Submit Opinion Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6"
            >
              <SubmitOpinion 
                topicId={DEFAULT_TOPIC_ID} 
                onSuccess={handleOpinionSubmitted}
              />
            </motion.div>
            
            {/* Info about mock data */}
            {!hasRealData && (
              <p className="mt-6 text-xs text-white/40">
                Showing mock data. Sign in and add your opinion to see real data.
              </p>
            )}
          </motion.div>

          {/* Right panel - Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0"
          >
            <OpinionGraph
              opinions={hasRealData ? topicData.opinions : undefined}
              ratings={hasRealData ? topicData.ratings : undefined}
              width={graphSize.width}
              height={graphSize.height}
              onNodeSelect={setSelectedNode}
              useMockData={!hasRealData}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
