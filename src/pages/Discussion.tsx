import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TTScreenInner } from '@/components/tt/TTScreen';
import { TTHeader } from '@/components/tt/TTHeader';
import { TTSideTabs, TTSideTabsHandle } from '@/components/tt/TTSideTabs';
import { TTBottomPanel } from '@/components/tt/TTBottomPanel';
import { TTCenterCTA } from '@/components/tt/TTCenterCTA';

import { useEventTopic } from '@/hooks/useEventTopic';
import { useEventPhase } from '@/hooks/useEventConfig';
import { useTopicData } from '@/hooks/useTopicData';
import { useTTChats } from '@/hooks/useTTChats';
import { useAuth } from '@/hooks/useAuth';
import { useTTNotifications } from '@/hooks/useTTNotifications';
import { useStoredNotifications } from '@/hooks/useStoredNotifications';
import { useAppBadge } from '@/hooks/useAppBadge';

import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useIsVerified } from '@/hooks/useIsVerified';
import { getPrefs, setPrefs } from '@/lib/tt-notification-prefs';
import { GraphEdge, GraphNode } from '@/types/graph';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatManager, FloatingChatManagerHandle } from '@/components/chat/FloatingChatManager';
import { TTHelpOverlay } from '@/components/tt/TTHelpOverlay';
import { TTOnboardingTour } from '@/components/tt/TTOnboardingTour';
import { useTutorialSteps } from '@/hooks/useTutorialSteps';

import { TTGateOverlay } from '@/components/tt/TTGateOverlay';
import { TTPolarizationPoll } from '@/components/tt/TTPolarizationPoll';
import { TTNudgeHint } from '@/components/tt/TTNudgeHint';
import { useNudgeStage } from '@/hooks/useNudgeStage';
import { TTInstallHint } from '@/components/tt/TTInstallHint';
import { TTFinalCountdown } from '@/components/tt/TTFinalCountdown';
import { TTEndPanel } from '@/components/tt/TTEndPanel';
import { TTModeNotice } from '@/components/tt/TTModeNotice';
import { TTSandboxPassphrase } from '@/components/tt/TTSandboxPassphrase';
import { ReadOnlyProvider } from '@/contexts/ReadOnlyContext';
import { setVerificationBypass } from '@/lib/verification';
import { useSandboxBots } from '@/hooks/useSandboxBots';
import { useTranslation } from 'react-i18next';
import { useArrowModePref } from '@/hooks/useArrowModePref';
import { TTDemoAccessPanel, openDemoAccess, useDemoAccess } from '@/components/tt/TTDemoAccessPanel';
import { PASSPHRASE_LOGIN_ENABLED } from '@/lib/constants';
import { TTSimControl } from '@/components/tt/TTSimControl';
import type { SimDataset } from '@/hooks/useSimDataset';
import { cn } from '@/lib/utils';
import { WediumPresentationContext } from '@/contexts/WediumPresentationContext';
import wediumScreenBg from '@/assets/wedium-screen-bg.webp.asset.json';
import wediumGraphDisc from '@/assets/wedium-graph-disc.webp.asset.json';
import type { TTBackgroundStyle } from '@/hooks/useBackgroundPref';


/**
 * Single-topic mobile UI. This build is locked to the Helsinki event topic (7mm9);
 * multi-topic swipe/loop logic has been removed.
 */
export default function TT({ mode = 'real', eventPreview = false, embedded = false, embedInteractive = false, wediumPresentation = false, simDataset = 'social', graphBackground }: { simDataset?: SimDataset; mode?: 'test' | 'real' | 'sandbox' | 'archive' | 'sim'; eventPreview?: boolean; embedded?: boolean; embedInteractive?: boolean; wediumPresentation?: boolean; graphBackground?: TTBackgroundStyle }) {
  useParams<{ topicId?: string }>(); // single-topic routes; params ignored
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isVerified } = useIsVerified();
  const isMobile = useIsMobile();
  const chatManagerRef = useRef<FloatingChatManagerHandle>(null);
  const { topic, isLoading: topicLoading, config: eventConfig } = useEventTopic(mode === 'sim' && simDataset === 'august' ? 'sim-august' : mode);
  const { phase, gated: phaseGated, now } = useEventPhase(eventConfig);
  const { arrowMode } = useArrowModePref();
  // Time phases apply to the real question only — /test stays open at all times.
  // Partner demo accounts (password-gated) may use the event topic before it opens.
  const demoAccess = useDemoAccess();
  const gated = mode === 'real' && phaseGated && !demoAccess;
  const isSandbox = mode === 'sandbox';
  const [sandboxGateClosed, setSandboxGateClosed] = useState(false);
  const isArchive = mode === 'archive';
  const isSim = mode === 'sim';
  // The August archive can be reopened as a second playground: writable for
  // everyone, while everything created during the event stays frozen server-side.
  const archiveOpen = isArchive && !!eventConfig?.archiveOpen;
  const readOnly = isArchive && !archiveOpen;
  const isPlayground = isSandbox || archiveOpen || isSim;
  const activeTopicId = topic?.id ?? '';
  const activeTopicTitle = topic?.title ?? '...';


  const [helpOpen, setHelpOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const sideTabsRef = useRef<TTSideTabsHandle>(null);
  const { steps: tourSteps, totalSteps: tourTotalSteps } = useTutorialSteps();
  const activeTourStep = tourStep > 0 ? tourSteps[tourStep - 1] ?? null : null;



  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chatNodeId, setChatNodeId] = useState<string | null>(null);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [graphActive, setGraphActive] = useState(true);
  const controlsVisible = !embedded || embedInteractive;


  const { data: activeData, isLoading: activeDataLoading } = useTopicData(activeTopicId);
  

  const visibleOwnOpinionId = useMemo(() => {
    if (!user || !activeData) return null;
    return activeData.opinions.find((o) => o.authorId === user.id)?.id ?? null;
  }, [user, activeData]);
  const { data: directOwnOpinionId = null, isLoading: directOwnOpinionLoading } = useQuery({
    queryKey: ['tt-own-opinion', activeTopicId, user?.id],
    enabled: !!activeTopicId && !!user,
    queryFn: async () => {
       if (!user) return null;
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id')
        .eq('topic_id', activeTopicId)
        .eq('user_id', user.id)
        .eq('visible', true)
        .maybeSingle();

      if (error) throw error;
      return data?.id ?? null;
    },
  });
  const ownOpinionId = visibleOwnOpinionId ?? directOwnOpinionId;
  const hasOwnOpinion = !!ownOpinionId;
  const ownOpinionResolved =
    !authLoading && !topicLoading && !activeDataLoading && (!user || !directOwnOpinionLoading);
  // Latch: once resolved, never fall back to "unknown" (transient refetch/error
  // states must not unmount the gate / register notice → visible blinking).
  const ownOpinionKnownRef = useRef(false);
  if (ownOpinionResolved) ownOpinionKnownRef.current = true;
  const ownOpinionKnown = ownOpinionResolved || ownOpinionKnownRef.current;

  // Live browser notifications (foreground) — the persisted list below drives the UI.
  useTTNotifications(activeTopicId);
  const {
    notifications: storedNotifications,
    unreadCount: unreadNotificationCount,
    markAllRead,
  } = useStoredNotifications(activeTopicId);
  const ttNotifications = useMemo(
    () =>
      storedNotifications.map((n) => ({
        id: n.id,
        type: (n.type as 'opinion' | 'chat_request' | 'message' | 'request_accepted') ?? 'message',
        title: n.title,
        body: n.body ?? undefined,
        unread: !n.read_at,
        topicId: n.topic_id ?? undefined,
      })),
    [storedNotifications],
  );

  const { data: unreadMap } = useUnreadMessages(activeTopicId, ownOpinionId);
  const { chats: ttChats } = useTTChats(activeTopicId, unreadMap);
  const { data: nudgeStage = null } = useNudgeStage(activeTopicId, ownOpinionId);

  // After the discussion has ended: winners (top 5 by bridge points) get the
  // prize panel, everyone else the wrap-up panel.
  const discussionEnded =
    mode === 'real' && !!eventConfig?.discussionEndAt && now >= eventConfig.discussionEndAt.getTime();
  const ownRank = useMemo(() => {
    if (!discussionEnded || !ownOpinionId || !activeData) return null;
    const ranked = activeData.opinions
      .filter((o) => !activeData.fakeOpinionIds.has(o.id))
      .map((o) => ({ id: o.id, pts: activeData.nodePoints?.get(o.id) ?? 0 }))
      .sort((a, b) => b.pts - a.pts || a.id.localeCompare(b.id));
    const idx = ranked.findIndex((r) => r.id === ownOpinionId);
    return idx >= 0 ? idx + 1 : null;
  }, [discussionEnded, ownOpinionId, activeData]);

  // The sandbox and the pre-event /go simulation are open to everyone:
  // no email verification nag before the event starts.
  useEffect(() => {
    setVerificationBypass(isPlayground || eventPreview);
    return () => setVerificationBypass(false);
  }, [isPlayground, eventPreview]);

  // Sandbox bots react to human opinions on page load / after submitting.
  // The reopened August question runs without bots.
  useSandboxBots(isSandbox, activeTopicId, hasOwnOpinion, 'sandbox');

  const handleDeleteOwnOpinion = useCallback(async () => {
    const { error } = await supabase.rpc('delete_my_opinion', { _topic_id: activeTopicId });
    if (error) throw error;
    setSelectedNode(null);
    setChatNodeId(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] }),
      queryClient.invalidateQueries({ queryKey: ['tt-chats', activeTopicId] }),
    ]);
  }, [activeTopicId, queryClient, user?.id]);


  // /go preview: opinions only live for one browser session. A new session
  // discards the previous preview opinion before the visitor sees the graph.
  const previewSessionCheckedRef = useRef(false);
  useEffect(() => {
    if (!eventPreview || !ownOpinionKnown || !activeTopicId || previewSessionCheckedRef.current) return;
    previewSessionCheckedRef.current = true;
    const key = `freemind_go_preview_session_${activeTopicId}`;
    let fresh = true;
    try { fresh = !sessionStorage.getItem(key); sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    if (fresh && hasOwnOpinion) void handleDeleteOwnOpinion().catch(() => undefined);
  }, [eventPreview, ownOpinionKnown, activeTopicId, hasOwnOpinion, handleDeleteOwnOpinion]);

  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    if (isMobile) return;
    chatManagerRef.current?.openReadOnlyChat(edge.source, edge.target);
  }, [isMobile]);
  const totalUnread = useMemo(() => {
    if (!unreadMap) return 0;
    let sum = 0;
    unreadMap.forEach((v) => { sum += v; });
    return sum;
  }, [unreadMap]);

  // Home-screen icon badge: unread notifications + unread chat messages.
  useAppBadge(unreadNotificationCount + totalUnread);



  // Auto-subscribe bell on first opinion
  const prevHasOwnRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ownOpinionKnown || !activeTopicId) return;
    const prev = prevHasOwnRef.current;
    prevHasOwnRef.current = hasOwnOpinion;
    if (prev === false && hasOwnOpinion) {
      if (!getPrefs(activeTopicId)?.enabled) {
        setPrefs(activeTopicId, { enabled: true });
        window.dispatchEvent(new CustomEvent('tt:subscription-changed', { detail: { topicId: activeTopicId, enabled: true } }));
      }
    }
  }, [hasOwnOpinion, ownOpinionKnown, activeTopicId]);

  // Lock viewport for this route only
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute('content') ?? '';
    meta?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1',
    );
    document.documentElement.classList.add('tt-mode');
    return () => {
      meta?.setAttribute('content', original);
      document.documentElement.classList.remove('tt-mode');
    };
  }, []);

  // Which blocking gate (if any) applies right now.
  // /test requires a passphrase login first, then the mandatory opinion.
  const gateVariant: 'countdown' | 'submit' | 'waiting' | 'login' | null = (() => {
    if (!ownOpinionKnown || !activeTopicId) return null;
    if (readOnly) return null;
    // Playground: ask for the opinion first, but it can be closed with a small cross.
    // /sim: the simulation provides activity, so no opinion-first gate.
    if (isSim) return null;
    if (isPlayground) return !hasOwnOpinion && !sandboxGateClosed ? 'submit' : null;
    if (gated) {
      if (phase === 'prelaunch') return 'countdown';
      if (!isVerified) return null; // unverified users may browse read-only
      if (!hasOwnOpinion) return 'submit';
      if (phase === 'submission') return 'waiting';
      return null;
    }
    if (mode === 'test' && !isVerified) return PASSPHRASE_LOGIN_ENABLED ? 'login' : null;
    if (!isVerified) return null;
    if (!hasOwnOpinion) return 'submit';
    return null;
  })();



  return (
    <ReadOnlyProvider value={readOnly}>
    <WediumPresentationContext.Provider value={wediumPresentation}>
    <div
      className={cn('fixed inset-0 discussion-surround flex items-center justify-center', wediumPresentation && 'wedium-discussion')}
      style={wediumPresentation ? ({
        '--wedium-screen-bg': `url("${wediumScreenBg.url}")`,
        '--wedium-disc': `url("${wediumGraphDisc.url}")`,
      } as React.CSSProperties) : undefined}
    >
      <div
        data-tt-phone-viewport
        className={cn(
          'relative h-[100dvh] w-full shrink-0 bg-background overflow-hidden transition-[max-width] duration-300',
          'max-w-[480px]',
        )}
      >
        <div className="absolute inset-0 overflow-hidden">
          {activeTopicId && (
            <TTScreenInner
              topicId={activeTopicId}
              hue={0}
              selectedNodeId={selectedNode?.id ?? chatNodeId}
              highlightAllNodes={false}
              onNodeSelect={setSelectedNode}
              onEdgeClick={handleEdgeClick}
              arrowMode={isSim || arrowMode}
              hideLegend={isSim}
              hideEmptyBridgingHint={isSim}
              backgroundVariant={graphBackground}
            />
          )}
        </div>

        {isSim && graphActive && !streamActive && (
          <div className={cn('pointer-events-none absolute left-3 z-20 max-w-[calc(100%-1.5rem)] rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[10px] font-medium text-foreground', controlsVisible ? 'top-[108px]' : 'top-[84px]')}>
            {t(simDataset === 'august' ? 'replay.datasetAugust' : 'replay.preview')}
          </div>
        )}

        <FloatingChatManager
          ref={chatManagerRef}
          topicId={activeTopicId}
          myOpinionId={ownOpinionId ?? undefined}
          unreadMessageCounts={unreadMap}
        />

        {/* Persistent chrome */}
        {!controlsVisible && <p className="absolute inset-x-6 top-7 z-20 text-center font-stream-editorial text-xl leading-snug text-foreground">{activeTopicTitle}</p>}
        {controlsVisible && <TTHeader
          topicTitle={activeTopicTitle}
          notifications={ttNotifications}
          onMarkAllRead={markAllRead}
          activeTopicId={activeTopicId}
          onOpenHelp={() => setHelpOpen(true)}
          onRestartTour={() => setTourStep(1)}
          onDeleteOpinion={isPlayground && hasOwnOpinion ? handleDeleteOwnOpinion : undefined}
          passphraseSwitch={isSim && !eventPreview}
          hideEventChannels={eventPreview}
          onOpenStream={() => sideTabsRef.current?.openPanel('stream')}

        />}
        {controlsVisible && <TTSideTabs
          ref={sideTabsRef}
          opinions={activeData?.opinions ?? []}
          chats={ttChats}
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion && !readOnly}
          myOpinionId={readOnly ? null : ownOpinionId}
          nodePoints={activeData?.nodePoints}
          unreadCount={totalUnread}
          onActiveChatChange={setChatNodeId}
          onPanelOpen={() => { setTourStep(0); setSelectedNode(null); }}
          onStreamActiveChange={setStreamActive}
          onGraphActiveChange={setGraphActive}


          onOpinionTap={(opinionId) => {
            const op = activeData?.opinions.find((o) => o.id === opinionId);
            if (op) {
              setSelectedNode({ id: op.id, x: 0, y: 0, opinion: op } as GraphNode);
            }
          }}
        />}

        {helpOpen && (
          <TTHelpOverlay
            onClose={() => setHelpOpen(false)}
            opinions={activeData?.opinions ?? []}
            ownOpinionId={ownOpinionId}
          />
        )}
        {controlsVisible && graphActive && ownOpinionKnown && !hasOwnOpinion && activeTopicId && !gateVariant && !readOnly && !streamActive && (
          isVerified || isPlayground || eventPreview ? (
            <TTCenterCTA
              topicId={activeTopicId}
              topicTitle={activeTopicTitle}
              highlight={false}
              disableNotificationPrompt={eventPreview}
              lowered={embedded}
              onOpinionCommitted={() => {
                queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
                queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
              }}
            />
          ) : (
            <div className="absolute left-1/2 bottom-[125px] -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[360px] flex justify-center">
              <div className="pointer-events-auto flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg text-sm text-foreground text-center">
                <div className="inline-flex flex-wrap justify-center items-center gap-x-1.5">
                  <span>{t('tt.registerToParticipate')}</span>
                  <a
                    href="/wedium"
                    className="text-primary hover:underline font-medium"
                  >
                    freemind.chat/wedium
                  </a>
                  <span>{t('tt.registerToParticipateSuffix')}</span>
                </div>
                {PASSPHRASE_LOGIN_ENABLED && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('tt:open-login'))}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {t('tt.alreadyHavePassphrase')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={openDemoAccess}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {t('tt.demo.openLink')}
                </button>
              </div>
            </div>

          )
        )}
        {mode === 'real' && !gateVariant && !discussionEnded && (
          <TTFinalCountdown endAt={eventConfig?.discussionEndAt} />
        )}
        {discussionEnded && !gateVariant && !selectedNode && (
          <TTEndPanel
            isWinner={!!ownRank && ownRank <= 5}
            rank={ownRank}
            ownOpinionId={ownOpinionId}
          />
        )}
        {controlsVisible && graphActive && hasOwnOpinion && !gateVariant && !selectedNode && !discussionEnded && !isArchive && !streamActive && (
          <TTNudgeHint
            stage={nudgeStage}
            onAction={() => sideTabsRef.current?.openPanel(nudgeStage === 'rate' ? 'opinions' : 'chats')}
            onVisibilityChange={setNudgeVisible}
          />
        )}
        {controlsVisible && graphActive && hasOwnOpinion && !gateVariant && !selectedNode && !nudgeVisible && !discussionEnded && !isArchive && !streamActive && <TTInstallHint />}

        {!eventPreview && <TTDemoAccessPanel />}


        {controlsVisible && graphActive && <TTBottomPanel
          topicId={activeTopicId}
          hasOwnOpinion={hasOwnOpinion && !readOnly}
          ownOpinionKnown={ownOpinionKnown}
          ownOpinionId={readOnly ? null : ownOpinionId}
          highlightAddOpinionForm={false}
          highlightLetsChatButton={activeTourStep?.highlight === 'chat'}
          highlightDisagreementScale={activeTourStep?.highlight === 'difference'}

          forceShowAddOpinionForm={false}
          suppressHintPanel={false}
          selected={
            selectedNode
              ? { id: selectedNode.id, text: selectedNode.opinion?.text ?? '' }
              : null
          }
          onLetsChat={(targetOpinionId) => {
            if (!hasOwnOpinion) return;
            sideTabsRef.current?.openChat(targetOpinionId);
            setSelectedNode(null);
          }}
          onOpinionSubmitted={() => setSelectedNode(null)}
          onOpinionCommitted={() => {
            queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
          }}
          onCloseSelection={() => {
            setSelectedNode(null);
          }}
        />}

        {gateVariant && (
          <TTGateOverlay
            variant={gateVariant}
            topicId={activeTopicId}
            topicTitle={activeTopicTitle}
            target={gateVariant === 'countdown' ? eventConfig?.opinionsOpenAt : eventConfig?.discussionOpenAt}
            isVerified={isVerified}
            onLoggedIn={() => {
              queryClient.invalidateQueries({ queryKey: ['is-verified'] });
              queryClient.invalidateQueries({ queryKey: ['tt-own-opinion'] });
              queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
            }}
            onSubmitted={() => {
              queryClient.invalidateQueries({ queryKey: ['tt-own-opinion', activeTopicId, user?.id] });
              queryClient.invalidateQueries({ queryKey: ['topic', activeTopicId] });
            }}
            onDismiss={isPlayground ? () => setSandboxGateClosed(true) : undefined}
          />
        )}


        {/* Poll also runs while the "waiting" gate is up: the user already
            submitted their opinion, so the pre-wave question applies. */}
        {mode === 'real' && (!gateVariant || gateVariant === 'waiting') && (
          <TTPolarizationPoll
            userId={user?.id}
            hasOwnOpinion={hasOwnOpinion}
            discussionEndAt={eventConfig?.discussionEndAt}
          />
        )}


        <TTOnboardingTour
          open={tourStep > 0 && !!activeTourStep}
          step={tourStep}
          totalSteps={tourTotalSteps}
          text={activeTourStep?.text ?? ''}
          onNext={() => setTourStep((s) => (s >= tourTotalSteps ? 0 : s + 1))}
          onDone={() => setTourStep(0)}
        />



        <TTSandboxPassphrase enabled={isPlayground && !eventPreview} />

        {(isSandbox || isArchive) && !eventPreview && !streamActive && (
          <TTModeNotice
            mode={isSim ? (simDataset === 'august' ? 'sim-august' : 'sim') : isSandbox ? 'sandbox' : archiveOpen ? 'archive-open' : 'archive'}
            offsetClass={isPlayground && !hasOwnOpinion ? 'bottom-[196px]' : 'bottom-[150px]'}
          />
        )}
        {isSim && <TTSimControl dataset={simDataset} topicId={activeTopicId} compact={!controlsVisible} />}

      </div>
    </div>
    </WediumPresentationContext.Provider>
    </ReadOnlyProvider>
  );
}
