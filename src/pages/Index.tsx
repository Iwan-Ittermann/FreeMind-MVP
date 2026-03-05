import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check, Flag, Settings, HelpCircle, ZoomIn, ZoomOut, Pencil, List, MessagesSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tutorial } from '@/components/Tutorial';
import { VideoMiniPlayer } from '@/components/VideoMiniPlayer';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { ConfigPanel } from '@/components/ConfigPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const chatManagerRef = useRef<FloatingChatManagerHandle>(null);
  const tutorial = useTutorialContext();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 600, height: 600 });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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

  // Track whether user has ever opened the help popover (for glow effect)
  const [helpEverOpened, setHelpEverOpened] = useState(() => {
    try { return localStorage.getItem('freemind_help_opened') === 'true'; } catch { return false; }
  });

  const handleHelpOpenChange = (open: boolean) => {
    if (open && !helpEverOpened) {
      setHelpEverOpened(true);
      try { localStorage.setItem('freemind_help_opened', 'true'); } catch {}
    }
  };

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

  const userChats = chatRequests.filter(r => r.status === 'accepted');
  const hasActiveChats = userChats.length > 0;

  const zoomScale = isZoomed ? 1.4 : 1;
  const displaySize = {
    width: Math.round(graphSize.width * zoomScale),
    height: Math.round(graphSize.height * zoomScale),
  };

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
        isLoading={isLoading}
        hideAddOpinion
        hideSidebarButtons
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
          style={isMobile && isZoomed ? { overflow: 'auto', maxWidth: '100%', maxHeight: 'calc(100vh - 140px)' } : undefined}
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
            width={displaySize.width}
            height={displaySize.height}
            onNodeSelect={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            useMockData={false}
            selectedNodeId={selectedNode?.id ?? null}
          />

          {/* Stats bar removed from here — now below the graph */}

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
                onClick={() => {
                  const header = document.querySelector('[data-opinion-dialog-trigger]');
                  if (header) (header as HTMLButtonElement).click();
                }}
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

      {/* Settings button — top-right */}
      <button
        onClick={() => setConfigOpen(true)}
        className="fixed top-24 right-4 z-40 h-12 w-12 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-lg"
        data-tutorial="settings-button"
      >
        <Settings className="h-5 w-5" />
      </button>

      {/* Help "?" button — bottom-left */}
      <div className="fixed bottom-6 left-6 z-40">
        <Popover onOpenChange={handleHelpOpenChange}>
          <PopoverTrigger asChild>
            <button
              className={`h-12 w-12 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-lg ${
                !helpEverOpened ? 'animate-pulse-fast ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
              }`}
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-64 p-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-foreground mb-3">
              <li>Teile deine Meinung</li>
              <li>Frag Chats an</li>
              <li>Bewerte deine Chats</li>
            </ol>
            <Button
              onClick={() => { tutorial.startTutorial(); }}
              variant="outline"
              size="sm"
              className="w-full border-accent text-accent hover:bg-accent/10"
            >
              {t('help.startTutorial')}
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Sidebar buttons — bottom-right, stacked vertically */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {isMobile && (
          <button
            onClick={() => setIsZoomed(z => !z)}
            className="h-12 w-12 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-lg"
          >
            {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
        )}
        <button
          onClick={() => {
            const btn = document.querySelector('[data-tutorial="opinions-button"]') as HTMLButtonElement;
            btn?.click();
          }}
          className="h-12 w-12 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-lg"
          title={t('sidebar.allOpinions', 'All Opinions')}
        >
          <List className="h-5 w-5" />
        </button>
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                const btn = document.querySelector('[data-tutorial="chats-button"]') as HTMLButtonElement;
                btn?.click();
              }}
              className="h-12 w-12 rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-lg"
              title={t('sidebar.myChats', 'My Chats')}
            >
              <MessagesSquare className="h-5 w-5" />
            </button>
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floating Chat Manager (desktop only) */}
      {!isMobile && (
        <FloatingChatManager
          ref={chatManagerRef}
          topicId={DEFAULT_TOPIC_ID}
          myOpinionId={myOpinion?.id}
          unreadMessageCounts={unreadMessageCounts}
        />
      )}

      {/* Config Panel */}
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
        hasExistingOpinion={!!myOpinion}
      />

      {/* Login prompt for tutorial */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[110] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowLoginPrompt(false)} />
            <div className="relative bg-card border border-border rounded-xl shadow-2xl p-6 max-w-xs text-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setShowLoginPrompt(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="text-foreground font-medium mb-4">{t('tutorial.pleaseLoginFirst')}</p>
              <Button
                onClick={() => navigate('/auth')}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {t('tutorial.loginToStart')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
