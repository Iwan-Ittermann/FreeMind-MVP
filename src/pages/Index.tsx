import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Flag, Pencil, AlertCircle, LogIn } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tutorial } from '@/components/Tutorial';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { SubmitOpinionDialog } from '@/components/SubmitOpinionDialog';
import { OpinionsSidebar } from '@/components/OpinionsSidebar';
import { ChatsSidebar } from '@/components/ChatsSidebar';
import { BottomTabBar, MobilePanel } from '@/components/BottomTabBar';
import { BottomPanel } from '@/components/BottomPanel';
import { DesktopBottomBar } from '@/components/DesktopBottomBar';
import { MainMenu, MenuContent } from '@/components/MainMenu';
import { AboutSidebar } from '@/components/AboutSidebar';
import { AuthDialog } from '@/components/AuthDialog';
import { GraphNode, GraphEdge, ChatRequest } from '@/types/graph';
import { useTopicData } from '@/hooks/useTopicData';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { useDisagreementRating } from '@/hooks/useOpinionRating';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/hooks/useClientIP';
import { toast } from 'sonner';
import { z } from 'zod';

const opinionSchema = z.object({
  text: z.string().trim().min(10).max(500),
});
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
  const [welcomeStep, setWelcomeStep] = useState<number>(() => {
    return localStorage.getItem('freemind-walkthrough-seen') === 'true' ? -1 : 0;
  });
  const [inlineOpinionText, setInlineOpinionText] = useState('');
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);
  const queryClient = useQueryClient();

  // Unified mobile panel state — menu is now part of this
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Desktop sidebar state
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Desktop settings sheet
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [aboutSheetOpen, setAboutSheetOpen] = useState(false);

  const { data: topicData, isLoading, error, activeChats, messageAnimations } = useTopicData(DEFAULT_TOPIC_ID);
  const {
    chatRequests, sendRequest, acceptRequest, declineRequest,
    isSending, isAccepting, isDeclining,
    getRequestBetween, hasAcceptedChat, hasPendingRequest,
  } = useChatRequests(DEFAULT_TOPIC_ID);

  const myOpinion = topicData?.opinions.find(op => op.authorId === user?.id);
  const { onlineOpinionIds } = usePresence(DEFAULT_TOPIC_ID, myOpinion?.id);
  const { data: unreadMessageCounts } = useUnreadMessages(DEFAULT_TOPIC_ID, myOpinion?.id);

  // Disagreement rating for selected node
  const { disagreement, setDisagreement, canRate: canRateDisagreement } = useDisagreementRating(
    DEFAULT_TOPIC_ID,
    myOpinion?.id ?? null,
    selectedNode?.id ?? null,
  );

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

  // Unified mobile panel toggle — all panels use the same path
  const handleMobilePanelChange = useCallback((panel: MobilePanel) => {
    setActiveMobilePanel(prev => prev === panel ? null : panel);
  }, []);

  // Graph sizing — accounts for ANY active panel including menu
  useEffect(() => {
    const updateSize = () => {
      const mobile = window.innerWidth < 768;
      if (mobile) {
        const panelHeight = activeMobilePanel ? window.innerHeight * 0.55 : 0;
        const availableHeight = window.innerHeight - 56 - 56 - panelHeight;
        const availableWidth = window.innerWidth - 4;
        const size = Math.min(availableWidth, availableHeight - 16);
        setGraphSize({ width: Math.max(size, 200), height: Math.max(size, 200) });
      } else {
        const panelWidth = (leftOpen ? 280 : 0) + (rightOpen ? 300 : 0);
        const available = window.innerWidth - panelWidth - 48;
        const size = Math.min(available, window.innerHeight - 140, 700);
        setGraphSize({ width: size, height: size });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [activeMobilePanel, leftOpen, rightOpen]);

  const handleOpinionSubmitted = () => {
    setOpinionDialogOpen(false);
    setInlineOpinionText('');
    queryClient.invalidateQueries({ queryKey: ['topic', DEFAULT_TOPIC_ID] });
    tutorial.onOpinionSubmitted();
  };

  const handleDismissWelcome = () => {
    localStorage.setItem('freemind-walkthrough-seen', 'true');
    setWelcomeStep(-1);
  };

  const handleNextWelcome = () => {
    if (welcomeStep >= 2) {
      handleDismissWelcome();
    } else {
      setWelcomeStep(prev => prev + 1);
    }
  };

  const handleInlineSubmit = async () => {
    const result = opinionSchema.safeParse({ text: inlineOpinionText });
    if (!result.success || !user) return;
    setIsSubmittingInline(true);
    try {
      const ipAddress = await getClientIP();
      const { error } = await supabase.rpc('submit_opinion', {
        _topic_id: DEFAULT_TOPIC_ID,
        _text: result.data.text,
        _ip_address: ipAddress,
      });
      if (error) {
        toast.error(error.message);
      } else {
        handleOpinionSubmitted();
        toast.success(t('opinion.submittedGraph'));
      }
    } catch {
      toast.error(t('opinion.failedToSubmit'));
    } finally {
      setIsSubmittingInline(false);
    }
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

  const openChatWith = useCallback((theirOpinionId: string) => {
    if (isMobile) {
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
      setActiveMobilePanel('chats');
    } else {
      chatManagerRef.current?.openReadOnlyChat(edge.source, edge.target);
    }
  };

  const handleSidebarOpinionClick = useCallback((opinionId: string) => {
    const node = topicData?.opinions.find(op => op.id === opinionId);
    if (node) {
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

  // Desktop bottom bar handlers
  const handleAbout = () => setAboutSheetOpen(prev => !prev);
  const handleTutorial = () => {
    if (!user) { setAuthDialogOpen(true); return; }
    tutorial.resetTutorialStatus();
    setTimeout(() => tutorial.startTutorial(), 300);
  };
  const handleSettings = () => setSettingsSheetOpen(prev => !prev);

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

  // Mobile: should we hide the below-graph CTA and show it in menu instead?
  const mobileChatsOpen = isMobile && activeMobilePanel === 'chats';
  const showCtaBelowGraph = !mobileChatsOpen;

  // Mobile graph height when any panel is open
  const mobileGraphStyle = isMobile && activeMobilePanel
    ? { height: 'calc(100vh - 56px - 55vh - 64px)' }
    : isMobile
    ? { height: 'calc(100vh - 56px - 64px)' }
    : undefined;

  // No hardcoded fallback — show empty until data loads
  const topicTitle = topicData?.title || '';

  // Inline opinion CTA component (reusable in menu)
  const inlineOpinionCta = user && !myOpinion && !isLoading ? (
    <div className="w-full max-w-sm px-4">
      <div className="flex gap-2 items-end">
        <Textarea
          value={inlineOpinionText}
          onChange={(e) => setInlineOpinionText(e.target.value)}
          placeholder={t('inlineCta.placeholder')}
          className="min-h-[44px] max-h-[80px] resize-none rounded-full px-4 py-2.5 text-sm bg-background border-primary/40 focus:border-primary"
          maxLength={500}
          rows={1}
        />
        <Button
          onClick={handleInlineSubmit}
          disabled={isSubmittingInline || inlineOpinionText.trim().length < 10}
          className="h-11 w-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 p-0"
        >
          {isSubmittingInline ? (
            <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      {inlineOpinionText.length > 0 && inlineOpinionText.trim().length < 10 && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {t('opinion.minCharacters')}
        </p>
      )}
    </div>
  ) : null;

  // Auth CTA for unauthenticated users (below graph in CTA slot)
  const authCta = !user ? (
    <div className="w-full max-w-sm px-4">
      <Button
        onClick={() => setAuthDialogOpen(true)}
        className="w-full h-12 text-base bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
      >
        <LogIn className="w-5 h-5 mr-2" />
        {t('common.signInOrSignUp', 'Einloggen / Loslegen')}
      </Button>
    </div>
  ) : null;

  return (
    <div className="h-screen bg-white dark:bg-[#1A1A2E] text-foreground overflow-hidden flex flex-col" onClick={handleBackgroundClick}>
      <Header
        title={topicTitle}
        enlarged={isMobile && !activeMobilePanel}
      />

      {/* Standalone mobile title when no panel open */}
      {isMobile && !activeMobilePanel && topicTitle && (
        <div className="px-4 py-2 text-center">
          <h1 className="text-lg font-semibold text-foreground truncate">{topicTitle}</h1>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop left panel — Opinions */}
        {!isMobile && leftOpen && (
          <div className="w-[280px] flex flex-col border-r border-border/20 bg-white/60 dark:bg-[#1A1A2E]/60 flex-shrink-0">
            <div className="flex-1 p-3 overflow-y-auto">
              <OpinionsSidebar
                open={true}
                onOpenChange={() => {}}
                topicId={DEFAULT_TOPIC_ID}
                variant="inline"
                onOpinionClick={handleSidebarOpinionClick}
                onChatOpen={openChatWith}
              />
            </div>
          </div>
        )}

        {/* Center — Graph + CTA */}
        <div
          className="flex-1 flex flex-col items-center justify-center px-0.5 lg:px-4 min-h-0"
          style={mobileGraphStyle}
        >
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
                  className="fixed lg:absolute bottom-20 lg:bottom-4 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-[calc(100%-2rem)] lg:max-w-sm bg-background/95 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-2xl z-50"
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
                    <p className="text-sm text-muted-foreground mb-2 pr-8">
                      "{selectedNode.opinion.text}"
                    </p>
                  )}

                  {/* Agreement slider — visible for all opinions except own */}
                  {canRateDisagreement && selectedNode.opinion.visible !== false && actionState !== 'own' && (
                    <div className="mb-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t('agreementRating.label')}</span>
                        <span className="text-xs font-mono text-muted-foreground">{100 - disagreement}</span>
                      </div>
                      <Slider
                        value={[100 - disagreement]}
                        onValueChange={(v) => setDisagreement(100 - v[0])}
                        max={100}
                        step={1}
                        className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.bg-primary]:bg-primary/30"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{t('agreementRating.disagree')}</span>
                        <span>{t('agreementRating.agree')}</span>
                      </div>
                    </div>
                  )}

                  {selectedNode.opinion.visible === false ? (
                    <p className="text-sm text-muted-foreground italic text-center py-2">Interaction with this content is disabled</p>
                  ) : !user ? (
                    <Button onClick={() => setAuthDialogOpen(true)} variant="outline" className="w-full border-border/40 h-12 text-base">
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

          {/* CTA slot below graph — auth CTA or opinion CTA */}
          {showCtaBelowGraph && (
            <AnimatePresence>
              {authCta && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 mb-20 lg:mb-14 relative z-10 flex justify-center"
                >
                  {authCta}
                </motion.div>
              )}
              {!authCta && inlineOpinionCta && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-sm mt-3 mb-20 lg:mb-14 relative z-10 flex justify-center"
                >
                  {inlineOpinionCta}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Desktop right panel — Chats + Requests */}
        {!isMobile && rightOpen && (
          <div className="w-[300px] flex flex-col border-l border-border/20 bg-white/60 dark:bg-[#1A1A2E]/60 flex-shrink-0">
            <div className="flex-1 p-3 overflow-y-auto">
              <ChatsSidebar
                open={true}
                onOpenChange={() => {}}
                topicId={DEFAULT_TOPIC_ID}
                onChatOpen={openChatWith}
                unreadMessageCounts={unreadMessageCounts}
                variant="inline"
                onChatClick={handleSidebarChatClick}
                onSignIn={() => setAuthDialogOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Desktop bottom bar */}
      {!isMobile && (
        <DesktopBottomBar
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleLeft={() => setLeftOpen(v => !v)}
          onToggleRight={() => setRightOpen(v => !v)}
          onAbout={handleAbout}
          onTutorial={handleTutorial}
          onSettings={handleSettings}
          totalUnread={totalUnreadCount}
        />
      )}

      {/* Mobile: Bottom panels — all three use the same BottomPanel shell */}
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
              onSignIn={() => setAuthDialogOpen(true)}
              opinionCtaNode={inlineOpinionCta}
            />
          </BottomPanel>

          {/* Menu now uses BottomPanel — same as opinions/chats */}
          <BottomPanel open={activeMobilePanel === 'menu'}>
            <MenuContent
              onClose={() => setActiveMobilePanel(null)}
              onTutorial={handleTutorial}
              onAbout={handleAbout}
              onSignIn={() => setAuthDialogOpen(true)}
              showOpinionCta={mobileChatsOpen || (!showCtaBelowGraph && !!inlineOpinionCta)}
              opinionCtaNode={inlineOpinionCta}
            />
          </BottomPanel>

          <BottomTabBar
            activePanel={activeMobilePanel}
            onPanelChange={handleMobilePanelChange}
            totalUnread={totalUnreadCount}
          />
        </>
      )}

      {/* Desktop settings sheet */}
      {!isMobile && (
        <MainMenu
          open={settingsSheetOpen}
          onOpenChange={setSettingsSheetOpen}
          topicId={DEFAULT_TOPIC_ID}
          onSignIn={() => setAuthDialogOpen(true)}
        />
      )}

      {/* Inline Auth Dialog */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />

      {/* About sidebar (bottom sheet) */}
      <AboutSidebar open={aboutSheetOpen} onOpenChange={setAboutSheetOpen} />

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

      {/* Welcome walkthrough — 3 steps */}
      <AnimatePresence>
        {welcomeStep >= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleDismissWelcome}
          >
            <motion.div
              key={welcomeStep}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border border-border/40 rounded-xl p-6 mx-4 max-w-sm shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {welcomeStep === 0 ? t('welcome.title') : welcomeStep === 1 ? t('welcome.step2Title') : t('welcome.step3Title')}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
                {welcomeStep === 0 ? t('welcome.message') : welcomeStep === 1 ? t('welcome.step2Message') : t('welcome.step3Message')}
              </p>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleDismissWelcome}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('welcome.skip')}
                </button>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === welcomeStep ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  ))}
                </div>
                <Button onClick={handleNextWelcome} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {welcomeStep === 2 ? t('welcome.ok') : t('welcome.next')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
