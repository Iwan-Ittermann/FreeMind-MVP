import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Flag, Pencil } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tutorial } from '@/components/Tutorial';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { SubmitOpinionDialog } from '@/components/SubmitOpinionDialog';
import { OpinionsSidebar } from '@/components/OpinionsSidebar';
import { ChatsSidebar } from '@/components/ChatsSidebar';
import { RequestsSidebar } from '@/components/RequestsSidebar';
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

const DEFAULT_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const chatManagerRef = useRef<FloatingChatManagerHandle>(null);
  const tutorial = useTutorialContext();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 600, height: 600 });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [opinionDialogOpen, setOpinionDialogOpen] = useState(false);
  const [opinionsOpen, setOpinionsOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
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

  const graphChatRequests: ChatRequest[] = chatRequests.map(r => ({
    id: r.id,
    requesterOpinionId: r.requester_opinion_id,
    targetOpinionId: r.target_opinion_id,
    status: r.status as 'pending' | 'accepted' | 'declined',
  }));

  useEffect(() => {
    const updateSize = () => {
      const mobile = window.innerWidth < 768;
      if (mobile) {
        const base = Math.min(window.innerWidth - 16, window.innerHeight - 160);
        setGraphSize({ width: base, height: base });
      } else {
        const size = Math.min(window.innerHeight - 100, 800);
        setGraphSize({ width: size, height: size });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleOpinionSubmitted = () => {
    setOpinionDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['topic', DEFAULT_TOPIC_ID] });
    tutorial.onOpinionSubmitted();
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    tutorial.onNodeClicked();
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (selectedNode && !target.closest('[data-opinion-panel]') && !target.closest('button') && !target.closest('[data-node-clickable]')) {
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
      if (isMobile) {
        navigate(`/chat?their=${selectedNode.id}`);
      } else {
        chatManagerRef.current?.openChat(selectedNode.id);
        setSelectedNode(null);
      }
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
      setSelectedNode(null);
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

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden flex flex-col" onClick={handleBackgroundClick}>
      <Header
        title={topicData?.title || "How to fix Climate Change?"}
        topicId={DEFAULT_TOPIC_ID}
        hasExistingOpinion={!!myOpinion}
        myOpinionId={myOpinion?.id}
        onChatOpen={handleFloatingChatOpen}
        totalUnread={totalUnreadCount}
        unreadMessageCounts={unreadMessageCounts}
        isLoading={isLoading}
        hideAddOpinion
        onOpenOpinions={() => setOpinionsOpen(true)}
        onOpenChats={() => setChatsOpen(true)}
        onOpenRequests={() => setRequestsOpen(true)}
      />

      {/* Mobile title below header */}
      {isMobile && topicData?.title && (
        <div className="w-full px-4 py-2 bg-black/80 border-b border-white/10">
          <h1 className="text-base font-semibold text-white truncate text-center">
            {topicData.title}
          </h1>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-2 md:px-4 py-4 md:py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative flex items-center justify-center"
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
            useMockData={false}
            selectedNodeId={selectedNode?.id ?? null}
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

        {/* Stats bar below the graph */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {hasRealData && (
            <span className="text-[10px] font-medium bg-white/10 text-white/60 px-2 py-0.5 rounded-full whitespace-nowrap">
              {topicData.opinions.length} {t('common.opinions')}
            </span>
          )}
          {topicData && (
            <span className="text-[10px] font-medium bg-white/10 text-white/60 px-2 py-0.5 rounded-full whitespace-nowrap">
              {topicData.ratings?.length ?? 0} Chats
            </span>
          )}
        </div>

        {/* Full-width CTA below graph */}
        <AnimatePresence>
          {user && !myOpinion && !isLoading && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm mt-4"
            >
              <Button
                onClick={() => setOpinionDialogOpen(true)}
                className="w-full h-11 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base shadow-lg shadow-accent/25 animate-pulse-fast"
              >
                <Pencil className="h-5 w-5 mr-2" />
                {t('header.addOpinion')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />

      {/* Floating Chat Manager (desktop only) */}
      {!isMobile && (
        <FloatingChatManager
          ref={chatManagerRef}
          topicId={DEFAULT_TOPIC_ID}
          myOpinionId={myOpinion?.id}
          unreadMessageCounts={unreadMessageCounts}
        />
      )}

      {/* Tutorial Overlay */}
      <Tutorial
        isActive={tutorial.isActive}
        currentStep={tutorial.currentStep}
        currentStepData={tutorial.currentStepData}
        totalSteps={tutorial.totalSteps}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onSkip={tutorial.skipTutorial}
        hasExistingOpinion={!!myOpinion}
      />

      {/* Opinion dialog */}
      <SubmitOpinionDialog
        open={opinionDialogOpen}
        onOpenChange={setOpinionDialogOpen}
        topicId={DEFAULT_TOPIC_ID}
        topicTitle={topicData?.title}
        onSuccess={handleOpinionSubmitted}
        hasExistingOpinion={!!myOpinion}
      />

      {/* Sidebars */}
      <OpinionsSidebar open={opinionsOpen} onOpenChange={setOpinionsOpen} topicId={DEFAULT_TOPIC_ID} />
      <ChatsSidebar open={chatsOpen} onOpenChange={setChatsOpen} topicId={DEFAULT_TOPIC_ID} onChatOpen={handleFloatingChatOpen} unreadMessageCounts={unreadMessageCounts} />
      <RequestsSidebar open={requestsOpen} onOpenChange={setRequestsOpen} topicId={DEFAULT_TOPIC_ID} />
    </div>
  );
};

export default Index;
