import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Flag, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { BottomTabBar, MobilePanel } from '@/components/BottomTabBar';
import { BottomPanel } from '@/components/BottomPanel';
import { MainMenu } from '@/components/MainMenu';
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
  const queryClient = useQueryClient();

  // Mobile bottom panel state
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Desktop sidebar collapse state
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

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

  // Handle mobile panel changes — close menu sheet when switching to menu panel
  const handleMobilePanelChange = useCallback((panel: MobilePanel) => {
    if (panel === 'menu') {
      setActiveMobilePanel(null);
      setMobileMenuOpen(true);
    } else {
      setMobileMenuOpen(false);
      setActiveMobilePanel(panel);
    }
  }, []);

  // Graph sizing — responsive to panel state
  useEffect(() => {
    const updateSize = () => {
      const mobile = window.innerWidth < 768;
      if (mobile) {
        const base = Math.min(window.innerWidth - 16, window.innerHeight - 160);
        // Shrink when panel is open
        const shrunk = activeMobilePanel ? base * 0.55 : base;
        setGraphSize({ width: shrunk, height: shrunk });
      } else {
        // Desktop: account for side panels
        const panelWidth = (leftCollapsed ? 0 : 280) + (rightCollapsed ? 0 : 300);
        const available = window.innerWidth - panelWidth - 48;
        const size = Math.min(available, window.innerHeight - 140, 700);
        setGraphSize({ width: size, height: size });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [activeMobilePanel, leftCollapsed, rightCollapsed]);

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
      await sendRequest({ requesterOpinionId: myOpinion.id, targetOpinionId: selectedNode.id });
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
      openChatWith(selectedNode.id);
      setSelectedNode(null);
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

  // Central chat-opening function — no more /chat navigation
  const openChatWith = useCallback((theirOpinionId: string) => {
    if (isMobile) {
      // Open chats panel on mobile
      setActiveMobilePanel('chats');
    } else {
      chatManagerRef.current?.openChat(theirOpinionId);
    }
  }, [isMobile]);

  const handleOpenChat = () => {
    if (!selectedNode) return;
    openChatWith(selectedNode.id);
    if (!isMobile) setSelectedNode(null);
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    if (isMobile) {
      // On mobile, just highlight and open chats panel
      setActiveMobilePanel('chats');
    } else {
      chatManagerRef.current?.openReadOnlyChat(edge.source, edge.target);
    }
  };

  // Sidebar highlight callbacks
  const handleSidebarOpinionClick = useCallback((opinionId: string) => {
    // Find the node and select it for highlighting
    const node = topicData?.opinions.find(op => op.id === opinionId);
    if (node) {
      // Use selectedNode to trigger graph highlighting
      setSelectedNode(prev => prev?.id === opinionId ? null : {
        id: opinionId,
        x: 0, y: 0, zone: 'outer' as const,
        opinion: {
          id: opinionId,
          text: node.text,
          authorId: node.authorId,
          visible: true,
          noticeText: null,
        },
      } as unknown as GraphNode);
    }
  }, [topicData?.opinions]);

  const handleSidebarChatClick = useCallback((theirOpinionId: string) => {
    openChatWith(theirOpinionId);
  }, [openChatWith]);

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
    <div className="min-h-screen bg-[#1A1A2E] text-foreground overflow-x-hidden flex flex-col" onClick={handleBackgroundClick}>
      <Header
        title={topicData?.title || "How to fix Climate Change?"}
        topicId={DEFAULT_TOPIC_ID}
        totalUnread={totalUnreadCount}
      />

      {/* Mobile title below header */}
      {isMobile && topicData?.title && (
        <div className="w-full px-4 py-2 bg-[#1A1A2E]/80 border-b border-border/20">
          <h1 className="text-base font-semibold text-foreground truncate text-center">
            {topicData.title}
          </h1>
        </div>
      )}

      {/* Stats below title (both mobile and desktop) */}
      {hasRealData && (
        <div className="flex items-center justify-center gap-2 py-1.5">
          <span className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">
            {topicData.opinions.length} {t('common.opinions')}
          </span>
          <span className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">
            {topicData.ratings?.length ?? 0} Chats
          </span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop left panel — Opinions */}
        {!isMobile && (
          <div className={`relative border-r border-border/20 bg-[#1A1A2E]/60 transition-all duration-300 flex-shrink-0 ${leftCollapsed ? 'w-0 overflow-hidden' : 'w-[280px]'}`}>
            {!leftCollapsed && (
              <div className="h-full p-3 overflow-hidden flex flex-col">
                <OpinionsSidebar
                  open={true}
                  onOpenChange={() => {}}
                  topicId={DEFAULT_TOPIC_ID}
                  variant="inline"
                  onOpinionClick={handleSidebarOpinionClick}
                  onChatOpen={openChatWith}
                />
              </div>
            )}
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-6 h-12 bg-muted/80 hover:bg-muted border border-border/40 rounded-r-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {leftCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Center — Graph + CTA */}
        <div className="flex-1 flex flex-col items-center justify-center px-2 md:px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative flex items-center justify-center transition-all duration-300"
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
              showLabels={isMobile ? 'none' : 'highlighted-only'}
            />

            {/* Selected node action panel */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="fixed md:absolute bottom-20 md:bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] md:max-w-sm bg-background/95 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-2xl z-50"
                  data-opinion-panel
                >
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
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
                    <p className="text-sm text-muted-foreground mb-4 pr-8">
                      "{selectedNode.opinion.text}"
                    </p>
                  )}

                  {selectedNode.opinion.visible === false ? (
                    <p className="text-sm text-muted-foreground italic text-center py-2">Interaction with this content is disabled</p>
                  ) : !user ? (
                    <Button onClick={() => navigate('/auth')} variant="outline" className="w-full border-border/40 h-12 text-base">
                      Sign In to Chat
                    </Button>
                  ) : actionState === 'own' ? (
                    <p className="text-sm text-muted-foreground italic text-center py-2">This is Your Opinion</p>
                  ) : !myOpinion ? (
                    <p className="text-sm text-muted-foreground italic text-center py-2">Submit your opinion first to chat</p>
                  ) : actionState === 'accepted' ? (
                    <div className="flex gap-2">
                      <Button onClick={handleOpenChat} className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base">
                        <MessageSquare className="w-5 h-5 mr-2" />Open Chat
                      </Button>
                      <Button onClick={() => setReportDialogOpen(true)} variant="ghost" className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10" title="Report">
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
                      <Button onClick={() => setReportDialogOpen(true)} variant="ghost" className="h-12 px-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10" title="Report">
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

          {/* CTA — between graph and bottom bar on mobile, only when no opinion */}
          <AnimatePresence>
            {user && !myOpinion && !isLoading && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm mt-3 px-4"
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

        {/* Desktop right panel — Chats + Requests */}
        {!isMobile && (
          <div className={`relative border-l border-border/20 bg-[#1A1A2E]/60 transition-all duration-300 flex-shrink-0 ${rightCollapsed ? 'w-0 overflow-hidden' : 'w-[300px]'}`}>
            {!rightCollapsed && (
              <div className="h-full p-3 overflow-hidden flex flex-col">
                <ChatsSidebar
                  open={true}
                  onOpenChange={() => {}}
                  topicId={DEFAULT_TOPIC_ID}
                  onChatOpen={openChatWith}
                  unreadMessageCounts={unreadMessageCounts}
                  variant="inline"
                  onChatClick={handleSidebarChatClick}
                />
              </div>
            )}
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="absolute top-1/2 -translate-y-1/2 -left-3 z-10 w-6 h-12 bg-muted/80 hover:bg-muted border border-border/40 rounded-l-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {rightCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile: Bottom panels */}
      {isMobile && (
        <>
          <BottomPanel open={activeMobilePanel === 'opinions'}>
            <OpinionsSidebar
              open={true}
              onOpenChange={() => setActiveMobilePanel(null)}
              topicId={DEFAULT_TOPIC_ID}
              variant="inline"
              onOpinionClick={handleSidebarOpinionClick}
              onChatOpen={openChatWith}
            />
          </BottomPanel>

          <BottomPanel open={activeMobilePanel === 'chats'}>
            <ChatsSidebar
              open={true}
              onOpenChange={() => setActiveMobilePanel(null)}
              topicId={DEFAULT_TOPIC_ID}
              onChatOpen={openChatWith}
              unreadMessageCounts={unreadMessageCounts}
              variant="inline"
              onChatClick={handleSidebarChatClick}
            />
          </BottomPanel>

          {/* Mobile menu uses Sheet via MainMenu */}
          <MainMenu
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            topicId={DEFAULT_TOPIC_ID}
          />

          <BottomTabBar
            activePanel={activeMobilePanel}
            onPanelChange={handleMobilePanelChange}
            totalUnread={totalUnreadCount}
            opinionCount={topicData?.opinions.length ?? 0}
          />
        </>
      )}

      {!isMobile && <Footer />}

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
    </div>
  );
};

export default Index;
