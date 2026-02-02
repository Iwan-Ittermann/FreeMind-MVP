import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Loader2, AlertCircle, ArrowLeft, Flag } from 'lucide-react';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { InfoPanel } from '@/components/InfoPanel';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tutorial } from '@/components/Tutorial';
import { FloatingHelpButton } from '@/components/FloatingHelpButton';
import { VideoMiniPlayer } from '@/components/VideoMiniPlayer';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { GraphNode, GraphEdge, ChatRequest } from '@/types/graph';
import { useTopicData } from '@/hooks/useTopicData';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useAuth } from '@/hooks/useAuth';
import { useHasJoinedTopic } from '@/hooks/useTopics';
import { usePresence } from '@/hooks/usePresence';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const VIDEO_URL = 'https://jmkbkwhiucnksdygbomc.supabase.co/storage/v1/object/public/tutorials/freemind-video-tutorial.mp4';

export default function TopicView() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const tutorial = useTutorialContext();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 600, height: 600 });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: hasJoined, isLoading: joinedLoading } = useHasJoinedTopic(topicId || '');
  const { data: topicData, isLoading, error, activeChats, messageAnimations } = useTopicData(topicId || '');
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
  } = useChatRequests(topicId || '');

  // Redirect if not joined
  useEffect(() => {
    if (!joinedLoading && !authLoading && !hasJoined && user) {
      navigate('/home');
      toast.error('You need to join this topic first');
    }
  }, [hasJoined, joinedLoading, authLoading, user, navigate]);

  // Find current user's opinion
  const myOpinion = topicData?.opinions.find(op => op.authorId === user?.id);

  // Track online presence
  const { onlineOpinionIds } = usePresence(topicId || '', myOpinion?.id);

  // Track unread messages
  const { data: unreadMessageCounts } = useUnreadMessages(topicId || '', myOpinion?.id);

  // Calculate total unread count for browser notification
  const totalUnreadCount = unreadMessageCounts 
    ? Array.from(unreadMessageCounts.values()).reduce((sum, count) => sum + count, 0)
    : 0;

  // Update browser tab title with unread count
  useBrowserNotification(totalUnreadCount, topicData?.title || 'freemind');

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
    queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
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
      navigate(`/chat?their=${selectedNode.id}&topic=${topicId}`);
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
      navigate(`/chat?their=${selectedNode.id}&topic=${topicId}`);
    }
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    // Open read-only chat view for any edge - pass both opinion IDs
    navigate(`/chat?their=${edge.target}&source=${edge.source}&readonly=true&topic=${topicId}`);
  };

  // Determine the action state for selected node
  const getNodeActionState = () => {
    if (!selectedNode || !myOpinion) return 'none';
    if (selectedNode.opinion.authorId === user?.id) return 'own';
    
    const isAccepted = hasAcceptedChat(myOpinion.id, selectedNode.id);
    if (isAccepted) return 'accepted';
    
    const sentRequest = hasPendingRequest(myOpinion.id, selectedNode.id);
    if (sentRequest) return 'pending_sent';
    
    const receivedRequest = hasPendingRequest(selectedNode.id, myOpinion.id);
    if (receivedRequest) return 'pending_received';
    
    return 'can_request';
  };

  const actionState = getNodeActionState();
  const hasRealData = topicData && topicData.opinions.length > 0;

  if (authLoading || joinedLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topicData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-card border border-border rounded-lg p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Topic Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This topic doesn't exist or you don't have access.
            </p>
            <Button onClick={() => navigate('/home')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden flex flex-col">
      {/* Header */}
      <Header 
        title={topicData.title}
        topicId={topicId}
        hasExistingOpinion={!!myOpinion}
        onOpinionSubmitted={handleOpinionSubmitted}
        myOpinionId={myOpinion?.id}
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
              question={topicData.title}
              opinionCount={topicData.opinions.length}
            />
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
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Open Chat
                      </Button>
                      <Button
                        onClick={() => setReportDialogOpen(true)}
                        variant="ghost"
                        className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        title="Report"
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
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        {isAccepting ? '...' : 'Accept'}
                      </Button>
                      <Button
                        onClick={handleDeclineRequest}
                        disabled={isAccepting || isDeclining}
                        variant="outline"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-12 text-base"
                      >
                        <X className="w-5 h-5 mr-2" />
                        {isDeclining ? '...' : 'Decline'}
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
                        {isSending ? '...' : 'Request Chat'}
                      </Button>
                      <Button
                        onClick={() => setReportDialogOpen(true)}
                        variant="ghost"
                        className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        title="Report"
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

      {/* Footer */}
      <Footer />

      {/* Tutorial Overlay */}
      <Tutorial
        isActive={tutorial.isActive}
        currentStep={tutorial.currentStep}
        currentStepData={tutorial.currentStepData}
        totalSteps={tutorial.totalSteps}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onSkip={tutorial.skipTutorial}
      />
    </div>
  );
}
