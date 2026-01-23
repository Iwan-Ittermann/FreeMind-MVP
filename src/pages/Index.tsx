import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Flag } from 'lucide-react';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { InfoPanel } from '@/components/InfoPanel';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { GraphNode, GraphEdge, ChatRequest } from '@/types/graph';
import { useTopicData } from '@/hooks/useTopicData';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DEFAULT_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 600, height: 600 });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: topicData, isLoading, error, activeChats, messageAnimations } = useTopicData(DEFAULT_TOPIC_ID);
  const { 
    chatRequests, 
    sendRequest, 
    acceptRequest, 
    declineRequest,
    isSending,
    isAccepting,
    isDeclining,
    getRequestBetween,
    hasAcceptedChat,
    hasPendingRequest,
  } = useChatRequests(DEFAULT_TOPIC_ID);

  // Find current user's opinion
  const myOpinion = topicData?.opinions.find(op => op.authorId === user?.id);

  // Track online presence
  const { onlineOpinionIds } = usePresence(DEFAULT_TOPIC_ID, myOpinion?.id);

  // Track unread messages
  const { data: unreadMessageCounts } = useUnreadMessages(DEFAULT_TOPIC_ID, myOpinion?.id);

  // Transform chat requests to graph format
  const graphChatRequests: ChatRequest[] = chatRequests.map(r => ({
    id: r.id,
    requesterOpinionId: r.requester_opinion_id,
    targetOpinionId: r.target_opinion_id,
    status: r.status as 'pending' | 'accepted' | 'declined',
  }));

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
    queryClient.invalidateQueries({ queryKey: ['topic', DEFAULT_TOPIC_ID] });
  };

  const handleRequestChat = async () => {
    if (!selectedNode || !myOpinion) return;
    try {
      await sendRequest({
        requesterOpinionId: myOpinion.id,
        targetOpinionId: selectedNode.id,
      });
      toast.success('Chat request sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedNode || !myOpinion) return;
    const request = getRequestBetween(myOpinion.id, selectedNode.id);
    if (!request) return;
    try {
      await acceptRequest(request.id);
      toast.success('Chat request accepted!');
      // Navigate to chat after accepting
      navigate(`/chat?their=${selectedNode.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedNode || !myOpinion) return;
    const request = getRequestBetween(myOpinion.id, selectedNode.id);
    if (!request) return;
    try {
      await declineRequest(request.id);
      toast.success('Chat request declined');
      setSelectedNode(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline request');
    }
  };

  const handleOpenChat = () => {
    if (selectedNode) {
      navigate(`/chat?their=${selectedNode.id}`);
    }
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    // Open read-only chat view for any edge - pass both opinion IDs
    navigate(`/chat?their=${edge.target}&source=${edge.source}&readonly=true`);
  };

  // Determine the action state for selected node
  const getNodeActionState = () => {
    if (!selectedNode || !myOpinion) return 'none';
    if (selectedNode.opinion.authorId === user?.id) return 'own';
    
    const isAccepted = hasAcceptedChat(myOpinion.id, selectedNode.id);
    if (isAccepted) return 'accepted';
    
    // Check if current user sent a request to this node
    const sentRequest = hasPendingRequest(myOpinion.id, selectedNode.id);
    if (sentRequest) return 'pending_sent';
    
    // Check if this node sent a request to current user
    const receivedRequest = hasPendingRequest(selectedNode.id, myOpinion.id);
    if (receivedRequest) return 'pending_received';
    
    return 'can_request';
  };

  const actionState = getNodeActionState();

  // Use mock data if no real data exists yet
  const hasRealData = topicData && topicData.opinions.length > 0;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden flex flex-col">
      {/* Header */}
      <Header 
        title={topicData?.title || "How to fix Climate Change?"}
        topicId={DEFAULT_TOPIC_ID}
        hasExistingOpinion={!!myOpinion}
        onOpinionSubmitted={handleOpinionSubmitted}
      />

      <div className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 md:gap-8 lg:gap-16">
          {/* Left panel - Info */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:flex-1 lg:max-w-md lg:pt-4 order-1 lg:order-none"
          >
            <InfoPanel 
              question={topicData?.title || "How to fix Climate Change?"}
              opinionCount={hasRealData ? topicData.opinions.length : 40}
            />
            
            {/* Info about mock data */}
            {!hasRealData && (
              <p className="mt-4 md:mt-6 text-xs text-white/40">
                Showing mock data. Sign in and add your opinion to see real data.
              </p>
            )}
          </motion.div>

          {/* Right panel - Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0 relative order-2 lg:order-none w-full flex justify-center"
          >
            <OpinionGraph
              opinions={hasRealData ? topicData.opinions : undefined}
              ratings={hasRealData ? topicData.ratings : undefined}
              chatRequests={graphChatRequests}
              activeChats={activeChats}
              messageAnimations={messageAnimations}
              currentUserId={user?.id}
              currentUserOpinionId={myOpinion?.id}
              onlineOpinionIds={onlineOpinionIds}
              unreadMessageCounts={unreadMessageCounts}
              width={graphSize.width}
              height={graphSize.height}
              onNodeSelect={setSelectedNode}
              onEdgeClick={handleEdgeClick}
              useMockData={!hasRealData}
            />

            {/* Selected node action panel */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="fixed md:absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] md:max-w-sm bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl z-50"
                >
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  {/* Show legal notice for hidden content, otherwise show opinion */}
                  {selectedNode.opinion.visible === false ? (
                    <div className="mb-4 pr-8 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">
                        {selectedNode.opinion.noticeText || 'This content has been hidden due to a suspected legal violation.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/80 mb-4 pr-8">
                      "{selectedNode.opinion.text}"
                    </p>
                  )}
                  
                  {/* Hidden content - only show close button, no chat actions */}
                  {selectedNode.opinion.visible === false ? (
                    <p className="text-sm text-white/40 italic text-center py-2">
                      Interaction with this content is disabled
                    </p>
                  ) : !user ? (
                    <Button
                      onClick={() => navigate('/auth')}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 h-12 text-base"
                    >
                      Sign In to Chat
                    </Button>
                  ) : actionState === 'own' ? (
                    <p className="text-sm text-white/60 italic text-center py-2">
                      This is Your Opinion
                    </p>
                  ) : !myOpinion ? (
                    <p className="text-sm text-white/60 italic text-center py-2">
                      Submit your opinion first to chat
                    </p>
                  ) : actionState === 'accepted' ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleOpenChat}
                        className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base"
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Open Chat
                      </Button>
                      <Button
                        onClick={() => setReportDialogOpen(true)}
                        variant="ghost"
                        className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        title="Report this opinion"
                      >
                        <Flag className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : actionState === 'pending_sent' ? (
                    <p className="text-sm text-accent italic text-center py-2">
                      ⏳ Waiting for them to accept your request...
                    </p>
                  ) : actionState === 'pending_received' ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAcceptRequest}
                        disabled={isAccepting || isDeclining}
                        className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        {isAccepting ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        onClick={handleDeclineRequest}
                        disabled={isAccepting || isDeclining}
                        variant="outline"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-12 text-base"
                      >
                        <X className="w-5 h-5 mr-2" />
                        {isDeclining ? 'Declining...' : 'Decline'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRequestChat}
                        disabled={isSending}
                        variant="outline"
                        className="flex-1 border-accent text-accent hover:bg-accent/10 h-12 text-base"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        {isSending ? 'Sending...' : 'Request to Chat'}
                      </Button>
                      <Button
                        onClick={() => setReportDialogOpen(true)}
                        variant="ghost"
                        className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        title="Report this opinion"
                      >
                        <Flag className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Report Dialog */}
            {selectedNode && (
              <ReportDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                contentId={selectedNode.id}
                contentType="Opinion"
                contentPreview={selectedNode.opinion.text}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
