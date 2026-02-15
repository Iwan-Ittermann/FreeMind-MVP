import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Flag, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { InfoPanel } from '@/components/InfoPanel';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tutorial } from '@/components/Tutorial';
// import { FloatingHelpButton } from '@/components/FloatingHelpButton'; // Commented out — replaced by floating settings
import { VideoMiniPlayer } from '@/components/VideoMiniPlayer';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { ConfigPanel } from '@/components/ConfigPanel';
import { GraphNode, GraphEdge, ChatRequest } from '@/types/graph';
import { useTopicData } from '@/hooks/useTopicData';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const VIDEO_URL = 'https://jmkbkwhiucnksdygbomc.supabase.co/storage/v1/object/public/tutorials/freemind-video-tutorial.mp4';
const DEFAULT_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const chatManagerRef = useRef<FloatingChatManagerHandle>(null);
  const tutorial = useTutorialContext();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 600, height: 600 });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: topicData, isLoading, error, activeChats, messageAnimations } = useTopicData(DEFAULT_TOPIC_ID);
  const {
    chatRequests, sendRequest, acceptRequest, declineRequest,
    isSending, isAccepting, isDeclining,
    getRequestBetween, hasAcceptedChat, hasPendingRequest,
  } = useChatRequests(DEFAULT_TOPIC_ID);

  const myOpinion = topicData?.opinions.find(op => op.authorId === user?.id);
  const { onlineOpinionIds } = usePresence(DEFAULT_TOPIC_ID, myOpinion?.id);
  const { data: unreadMessageCounts } = useUnreadMessages(DEFAULT_TOPIC_ID, myOpinion?.id);

  const totalUnreadCount = unreadMessageCounts
    ? Array.from(unreadMessageCounts.values()).reduce((sum, count) => sum + count, 0)
    : 0;
  useBrowserNotification(totalUnreadCount);

  // Auto-start tutorial for new accounts
  useEffect(() => {
    if (user && localStorage.getItem('freemind_new_account') === 'true') {
      localStorage.removeItem('freemind_new_account');
      if (!tutorial.hasCompletedTutorial()) {
        setTimeout(() => tutorial.startTutorial(), 500);
      }
    }
  }, [user, tutorial]);

  const graphChatRequests: ChatRequest[] = chatRequests.map(r => ({
    id: r.id,
    requesterOpinionId: r.requester_opinion_id,
    targetOpinionId: r.target_opinion_id,
    status: r.status as 'pending' | 'accepted' | 'declined',
  }));

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
    tutorial.onOpinionSubmitted();
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    tutorial.onNodeClicked();
  };

  // Close opinion box when clicking outside
  const handleBackgroundClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Only close if clicking on the main container background, not on interactive elements
    if (selectedNode && !target.closest('[data-opinion-panel]') && !target.closest('svg') && !target.closest('button')) {
      setSelectedNode(null);
    }
  };

  const handleRequestChat = async () => {
    if (!selectedNode || !myOpinion) return;
    try {
      await sendRequest({
        requesterOpinionId: myOpinion.id,
        targetOpinionId: selectedNode.id,
      });
      toast.success('Chat request sent!');
      tutorial.onChatRequested();
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
    if (!selectedNode) return;
    if (isMobile) {
      navigate(`/chat?their=${selectedNode.id}`);
    } else {
      chatManagerRef.current?.openChat(selectedNode.id);
      setSelectedNode(null); // Close opinion box when opening floating chat
    }
  };

  const handleFloatingChatOpen = (theirOpinionId: string) => {
    if (isMobile) {
      navigate(`/chat?their=${theirOpinionId}`);
    } else {
      chatManagerRef.current?.openChat(theirOpinionId);
    }
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    if (isMobile) {
      navigate(`/chat?their=${edge.target}&source=${edge.source}&readonly=true`);
    } else {
      chatManagerRef.current?.openReadOnlyChat(edge.source, edge.target);
    }
  };

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

  // Find active chats for config panel
  const userChats = chatRequests.filter(r => r.status === 'accepted');
  const hasActiveChats = userChats.length > 0;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden flex flex-col" onClick={handleBackgroundClick}>
      <Header
        title={topicData?.title || "How to fix Climate Change?"}
        topicId={DEFAULT_TOPIC_ID}
        hasExistingOpinion={!!myOpinion}
        onOpinionSubmitted={handleOpinionSubmitted}
        myOpinionId={myOpinion?.id}
        onChatOpen={handleFloatingChatOpen}
        totalUnread={totalUnreadCount}
        unreadMessageCounts={unreadMessageCounts}
      />

      <div className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 md:gap-8 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:flex-1 lg:max-w-md lg:pt-4 order-1 lg:order-none"
          >
            <InfoPanel
              question={topicData?.title || "How to fix Climate Change?"}
              opinionCount={hasRealData ? topicData.opinions.length : 40}
            />
            {!hasRealData && (
              <p className="mt-4 md:mt-6 text-xs text-white/40">
                Showing mock data. Sign in and add your opinion to see real data.
              </p>
            )}
          </motion.div>

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
              onNodeSelect={handleNodeClick}
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
                  data-opinion-panel
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
                    <Button onClick={() => navigate('/auth')} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-12 text-base">
                      Sign In to Chat
                    </Button>
                  ) : actionState === 'own' ? (
                    <p className="text-sm text-white/60 italic text-center py-2">This is Your Opinion</p>
                  ) : !myOpinion ? (
                    <p className="text-sm text-white/60 italic text-center py-2">Submit your opinion first to chat</p>
                  ) : actionState === 'accepted' ? (
                    <div className="flex gap-2">
                      <Button onClick={handleOpenChat} className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base">
                        <MessageSquare className="w-5 h-5 mr-2" />Open Chat
                      </Button>
                      <Button onClick={() => setReportDialogOpen(true)} variant="ghost" className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10" title="Report this opinion">
                        <Flag className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : actionState === 'pending_sent' ? (
                    <p className="text-sm text-accent italic text-center py-2">⏳ Waiting for them to accept your request...</p>
                  ) : actionState === 'pending_received' ? (
                    <div className="flex gap-2">
                      <Button onClick={handleAcceptRequest} disabled={isAccepting || isDeclining} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base">
                        <Check className="w-5 h-5 mr-2" />{isAccepting ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button onClick={handleDeclineRequest} disabled={isAccepting || isDeclining} variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-12 text-base">
                        <X className="w-5 h-5 mr-2" />{isDeclining ? 'Declining...' : 'Decline'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleRequestChat} disabled={isSending} variant="outline" className="flex-1 border-accent text-accent hover:bg-accent/10 h-12 text-base">
                        <Send className="w-5 h-5 mr-2" />{isSending ? 'Sending...' : 'Request to Chat'}
                      </Button>
                      <Button onClick={() => setReportDialogOpen(true)} variant="ghost" className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10" title="Report this opinion">
                        <Flag className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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

      <Footer />

      {/* Floating Settings Button (lower-left) */}
      <button
        onClick={() => setConfigOpen(true)}
        className="fixed bottom-6 left-6 z-40 h-10 w-10 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-lg"
        data-tutorial="settings-button"
      >
        <Settings className="h-4 w-4" />
      </button>

      {/* Floating Chat Manager (desktop only) */}
      {!isMobile && (
        <FloatingChatManager
          ref={chatManagerRef}
          topicId={DEFAULT_TOPIC_ID}
          myOpinionId={myOpinion?.id}
          unreadMessageCounts={unreadMessageCounts}
        />
      )}

      {/* Config Panel for floating settings */}
      <ConfigPanel
        open={configOpen}
        onOpenChange={setConfigOpen}
        hasActiveChats={hasActiveChats}
      />

      {/* Video Mini Player */}
      <VideoMiniPlayer
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoSrc={VIDEO_URL}
      />

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
};

export default Index;
