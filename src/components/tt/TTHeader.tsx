import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Settings, X, SlidersHorizontal, MessageSquare, MessageCircle, Sparkles, CircleHelp, HelpCircle, LogOut, Mail, MoveUpRight, Orbit, Smartphone, Trash2, Waves, Scale } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthForm } from '@/components/AuthForm';
import { TopicTitleWithLinks } from '@/components/TopicTitleWithLinks';
import { useArrowModePref } from '@/hooks/useArrowModePref';
import { useBackgroundPref } from '@/hooks/useBackgroundPref';
import { useStreamSpiralPref } from '@/hooks/useStreamSpiralPref';
import {
  NotificationFilters,
  getGlobalFilters,
  setGlobalFilters,
  getPrefs,
  setPrefs,
} from '@/lib/tt-notification-prefs';
import { PASSPHRASE_LOGIN_ENABLED } from '@/lib/constants';
import { clearDemoAccess } from '@/components/tt/TTDemoAccessPanel';
import { useWediumPresentation } from '@/contexts/WediumPresentationContext';
import wediumLogo from '@/assets/wedium-logo-rgb-neg.png.asset.json';
import {
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  syncPushFilters,
  needsInstallFirst,
} from '@/lib/web-push';


export interface TTNotification {
  id: string;
  type: 'opinion' | 'chat_request' | 'message' | 'request_accepted';
  title: string;
  body?: string;
  unread?: boolean;
  topicId?: string;
}

interface TTHeaderProps {
  topicTitle: string;
  notifications?: TTNotification[];
  onMarkAllRead?: () => void;
  onRestartTour?: () => void;
  onOpenHelp?: () => void;
  activeTopicId?: string;
  /** Show a "delete my opinion" action (playground discussions only). */
  onDeleteOpinion?: () => Promise<void> | void;
  /** Show the silent passphrase and allow switching account via passphrase. */
  passphraseSwitch?: boolean;
  onOpenStream?: () => void;
  /** Pre-event: hide daily mail and push options. */
  hideEventChannels?: boolean;
}


const FILTER_ITEMS: {
  key: keyof NotificationFilters;
  iconEl: React.ReactNode;
  labelKey: string;
  disabled?: boolean;
}[] = [
  { key: 'newOpinion', iconEl: <Bell className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newOpinion' },
  { key: 'newMessage', iconEl: <MessageSquare className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newMessage' },
  { key: 'bridgePoints', iconEl: <Sparkles className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.bridgePoints' },

  { key: 'newChat', iconEl: <MessageCircle className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newChat' },
  { key: 'newHighlight', iconEl: <Sparkles className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newHighlight', disabled: true },
];

const LANGUAGES = [
  { code: 'de', flag: '🇩🇪', labelKey: 'common.german' },
  { code: 'en', flag: '🇬🇧', labelKey: 'common.english' },
];

export function TTHeader({ topicTitle, notifications = [], onMarkAllRead, onRestartTour, onOpenHelp, activeTopicId, onDeleteOpinion, passphraseSwitch = false, onOpenStream, hideEventChannels = false }: TTHeaderProps) {
  const wedium = useWediumPresentation();
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { t } = useTranslation();
  const { user } = useAuth();
  const { arrowMode, setArrowMode } = useArrowModePref();
  const { bgStyle, setBgStyle } = useBackgroundPref();
  const { showStreamSpiral, toggleStreamSpiral } = useStreamSpiralPref();
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [filters, setFilters] = useState<NotificationFilters>(getGlobalFilters);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [digestOptIn, setDigestOptIn] = useState(true);
  const [digestBusy, setDigestBusy] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const hasUnread = notifications.some((n) => n.unread);

  useEffect(() => {
    if (!activeTopicId) return;
    const sync = () => setSubscribedHere(!!getPrefs(activeTopicId)?.enabled);
    sync();
    window.addEventListener('tt:subscription-changed', sync);
    return () => window.removeEventListener('tt:subscription-changed', sync);
  }, [activeTopicId]);

  const toggleSubscribeHere = () => {
    if (!activeTopicId) return;
    const next = !subscribedHere;
    setPrefs(activeTopicId, { enabled: next });
    setSubscribedHere(next);
    window.dispatchEvent(
      new CustomEvent('tt:subscription-changed', { detail: { topicId: activeTopicId, enabled: next } }),
    );
  };

  // Daily unread-notification digest opt-in (default on).
  useEffect(() => {
    if (!user) {
      setDigestOptIn(true);
      return;
    }
    let cancelled = false;
    supabase.rpc('get_notification_digest_opt_in').then(({ data }) => {
      if (!cancelled) setDigestOptIn(data !== false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleDigestOptIn = async () => {
    if (!user) {
      toast.error(t('tt.digest.needsLogin', 'Bitte melde dich an, um die E-Mail-Einstellung zu ändern.'));
      return;
    }
    const next = !digestOptIn;
    setDigestBusy(true);
    const { data, error } = await supabase.rpc('set_notification_digest_opt_in', { _enabled: next });
    setDigestBusy(false);
    if (error || data !== true) {
      toast.error(t('tt.report.noEmail', 'Für dieses Konto ist keine E-Mail-Adresse hinterlegt.'));
      return;
    }
    setDigestOptIn(next);
    toast.success(
      next
        ? t('tt.digest.on', 'Tägliche Kurz-Mail aktiviert')
        : t('tt.digest.off', 'Tägliche Kurz-Mail abbestellt'),
    );
  };

  const handleSignOut = async () => {
    clearDemoAccess();
    await supabase.auth.signOut({ scope: 'local' });
    setAccountOpen(false);
    setShowLogin(false);
    toast.success(t('config.signedOut', 'Signed out'));
    // Demo/test sessions must fall back to the lock screen.
    window.location.reload();
  };

  // Single-topic build: flat notification list (no per-topic grouping).

  useEffect(() => {
    if (!accountOpen && !bellOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (accountOpen && accountRef.current && !accountRef.current.contains(target) && (!accountDropdownRef.current || !accountDropdownRef.current.contains(target))) {
        setAccountOpen(false);
        setShowLogin(false);
      }
      if (bellOpen && bellRef.current && !bellRef.current.contains(target) && (!bellDropdownRef.current || !bellDropdownRef.current.contains(target))) {
        setBellOpen(false);
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountOpen, bellOpen]);

  // Allow other parts of the app (e.g. the "register" notice) to open the login form
  useEffect(() => {
    const openLogin = () => {
      setAccountOpen(true);
      setShowLogin(true);
    };
    window.addEventListener('tt:open-login', openLogin);
    return () => window.removeEventListener('tt:open-login', openLogin);
  }, []);


  const toggleFilter = (key: keyof NotificationFilters) => {
    setFilters((f) => {
      const next = { ...f, [key]: !f[key] };
      setGlobalFilters(next);
      void syncPushFilters(next);
      window.dispatchEvent(new CustomEvent('tt:subscription-changed'));
      return next;
    });
  };

  // ── Web Push (installed home-screen app) ──
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'blocked' | 'off' | 'on'>('off');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushStatus().then((s) => {
      if (!cancelled) setPushStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushStatus === 'on') {
        await unsubscribeFromPush();
        setPushStatus('off');
        toast.success(t('tt.push.off', 'Push-Benachrichtigungen aus'));
        return;
      }
      const result = await subscribeToPush();
      if (result === 'subscribed') {
        setPushStatus('on');
        await syncPushFilters(filters);
        toast.success(t('tt.push.on', 'Push-Benachrichtigungen aktiviert'));
      } else if (result === 'needs-install') {
        toast.error(
          t('tt.push.needsInstall', 'Auf dem iPhone zuerst über „Teilen → Zum Home-Bildschirm“ installieren.'),
        );
      } else if (result === 'needs-login') {
        toast.error(t('tt.push.needsLogin', 'Bitte melde dich an, um Push zu aktivieren.'));
      } else if (result === 'denied') {
        toast.error(t('tt.push.denied', 'Benachrichtigungen sind im Gerät blockiert.'));
      } else if (result === 'blocked') {
        toast.error(t('tt.push.previewHint', 'Push funktioniert nur in der veröffentlichten App.'));
      } else if (result === 'unsupported') {
        toast.error(t('tt.push.unsupported', 'Dieses Gerät unterstützt kein Web-Push.'));
      } else {
        toast.error(t('tt.push.error', 'Push konnte nicht aktiviert werden.'));
      }
    } finally {
      setPushBusy(false);
    }
  };


  return (
    <>
      <header className="absolute top-0 inset-x-0 z-30 px-3 pointer-events-none bg-background/60 backdrop-blur-sm">
        <div className="flex items-center justify-between pointer-events-auto py-1 border-b border-border/30">
          {/* Baseline-aligned: the logo's ink sits flush with its box bottom, so sharing the
              text baseline keeps both wordmarks on one visual line. */}
          <div className="flex min-w-0 items-baseline gap-2">
          <Link
            to="/"
            className="text-foreground/90 font-medium tracking-tight lowercase text-[13px] leading-none hover:text-foreground transition-colors"
          >
            freemind
          </Link>
          {wedium && <><span className="text-muted-foreground" aria-hidden>×</span><a href="https://wedium.social" target="_blank" rel="noreferrer" className="wedium-wordmark"><img src={wediumLogo.url} alt="Wedium" className="h-[15px] w-auto object-contain" /></a></>}
          </div>

          <div className="flex items-center gap-0.5">
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                data-tt-help="help-button"
                className="h-7 w-7 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
                aria-label={t('tt.help.open', 'Help')}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            <div ref={bellRef}>
              <button
                onClick={() => {
                  const wasOpen = bellOpen;
                  setBellOpen((o) => !o);
                  setAccountOpen(false);
                  setFiltersOpen(false);
                  if (!wasOpen && onMarkAllRead) onMarkAllRead();
                }}
                className="relative h-7 w-7 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
                aria-label={t('tt.notifications')}
              >
                <Bell className="w-4 h-4" />
                {hasUnread && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-destructive" />
                )}
              </button>
            </div>
            <div ref={accountRef}>
              <button
                onClick={() => {
                  setAccountOpen((o) => !o);
                  setBellOpen(false);
                  setShowLogin(false);
                }}
                data-tt-help="settings"
                className="h-7 w-7 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
                aria-label={t('tt.settingsAndGuide', 'Settings & guide')}
              >
                {accountOpen ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Topic question — fixed-height band directly under the slim header row.
          Uses a top-anchored gradient so it stays legible whether the nebula
          background reaches this area (short viewports) or not (tall viewports). */}
      <div
        aria-hidden
        className="absolute left-0 right-0 z-20 pointer-events-none bg-gradient-to-b from-background/85 via-background/60 to-transparent"
        style={{ top: 28, height: 104 }}
      />
      <div
        className="absolute left-0 right-0 z-30 flex items-center justify-center px-7 text-center pointer-events-auto"
        style={{ top: 36, height: 76 }}
      >
        <h1
          className="font-serif italic leading-snug text-foreground line-clamp-2 px-2"
          style={{ fontSize: 'clamp(1.05rem, 4.4vw, 1.45rem)' }}
        >
          <TopicTitleWithLinks title={topicTitle} />
        </h1>
      </div>



      {/* Notifications dropdown (header bell) — rendered outside header but checked via bellRef */}
      <AnimatePresence>
        {bellOpen && (
          <motion.div
            ref={bellDropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{ transformOrigin: '90% 0%' }}
            className="absolute top-12 right-12 z-40 w-72 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t('tt.notifications')}</h3>
              <div className="flex items-center gap-1">
                {activeTopicId && (
                  <button
                    onClick={toggleSubscribeHere}
                    className={`p-1 rounded-md transition-colors ${subscribedHere ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-label={subscribedHere ? t('tt.notifySubscribeOff', 'Turn off') : t('tt.notifySubscribeOn', 'Turn on')}
                    title={subscribedHere ? t('tt.subscribed') : t('tt.notSubscribed')}
                  >
                    {subscribedHere ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => setFiltersOpen((o) => !o)}
                  className={`p-1 rounded-md transition-colors ${filtersOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label={t('tt.notifFilterTitle')}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline filter panel */}
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-border/30"
                >
                  <div className="px-3 py-2 space-y-0.5">
                    {FILTER_ITEMS.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => !item.disabled && toggleFilter(item.key)}
                        disabled={item.disabled}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          item.disabled
                            ? 'opacity-40 cursor-not-allowed'
                            : filters[item.key]
                              ? 'bg-primary/10 text-foreground'
                              : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          filters[item.key] && !item.disabled ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {item.iconEl}
                        </div>
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {!item.disabled && (
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            filters[item.key] ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                          }`}>
                            {filters[item.key] && (
                              <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        )}
                        {item.disabled && (
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            {t('tt.notifFilter.comingSoon')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!hideEventChannels && pushStatus !== 'unsupported' && (
              <div className="px-3 py-2 border-b border-border/30">
                <button
                  onClick={togglePush}
                  disabled={pushBusy || pushStatus === 'blocked'}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                    pushStatus === 'on' ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                  } ${pushStatus === 'blocked' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${pushStatus === 'on' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <span className="flex-1">
                    {t('tt.push.toggle', 'Push-Benachrichtigungen aufs Handy')}
                  </span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    pushStatus === 'on' ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                  }`}>
                    {pushStatus === 'on' && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
                {pushStatus === 'blocked' && (
                  <p className="px-2 pt-1 text-[10px] text-muted-foreground">
                    {t('tt.push.previewHint', 'Push funktioniert nur in der veröffentlichten App.')}
                  </p>
                )}
                {pushStatus !== 'blocked' && needsInstallFirst() && (
                  <p className="px-2 pt-1 text-[10px] text-muted-foreground">
                    {t('tt.push.iosHint', 'iPhone: zuerst über „Teilen → Zum Home-Bildschirm“ installieren, dann hier aktivieren.')}
                  </p>
                )}
              </div>
            )}

            <div className={`px-3 py-2 border-b border-border/30 ${hideEventChannels ? "hidden" : ""}`}>

              <button
                onClick={toggleDigestOptIn}
                disabled={digestBusy}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  digestOptIn ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${digestOptIn ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">
                  {t('tt.digest.emailToggle', 'Tägliche Kurz-Mail: dein Tag, Top 5, Neues')}
                </span>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  digestOptIn ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                }`}>
                  {digestOptIn && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
              {!user && (
                <p className="px-2 pt-1 text-[10px] text-muted-foreground">
                  {t('tt.report.needsLogin', 'Bitte melde dich an, um die Tagesmail zu erhalten.')}
                </p>
              )}
            </div>

            <div className="max-h-72 overflow-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 px-4">
                  {t('tt.noNotifications')}
                </p>
              ) : (
                <ul className="divide-y divide-border/20">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className="px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
                    >
                      <p className={`text-sm ${n.unread ? 'font-semibold' : 'text-foreground/80'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              to="/benachrichtigungen"
              onClick={() => setBellOpen(false)}
              className="block border-t border-border/30 px-4 py-2.5 text-center text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              {t('tt.allNotifications', 'Alle Benachrichtigungen')}
            </Link>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Account dropdown */}
      <AnimatePresence>
        {accountOpen && (
          <motion.div
            ref={accountDropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{ transformOrigin: '95% 0%' }}
            className="absolute top-12 right-3 z-40 w-72 space-y-2 pointer-events-auto"
          >
            <div className="rounded-2xl bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl p-3">
              {onOpenStream && (
                <button
                  onClick={() => { setAccountOpen(false); onOpenStream(); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-primary"><Waves className="w-3.5 h-3.5" /></div>
                  <span className="flex-1">{t('tt.openStream')}</span>
                </button>
              )}

              <Link
                to="/legal"
                onClick={() => setAccountOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"><Scale className="w-3.5 h-3.5" /></div>
                <span className="flex-1">{t('tt.imprint')}</span>
              </Link>
              <button
                onClick={() => setArrowMode(!arrowMode)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  arrowMode ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${arrowMode ? 'text-primary' : 'text-muted-foreground'}`}>
                  <MoveUpRight className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">{t('tt.arrowModeToggle', 'Chats als Pfeile zeigen')}</span>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  arrowMode ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                }`}>
                  {arrowMode && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              <button
                onClick={() => setBgStyle(bgStyle === 'eye' ? 'cosmos' : 'eye')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  bgStyle === 'eye' ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bgStyle === 'eye' ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Orbit className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">
                  {t('tt.backgroundToggleEye', 'Hintergrund: Auge')}
                </span>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  bgStyle === 'eye' ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                }`}>
                  {bgStyle === 'eye' && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              <button
                onClick={toggleStreamSpiral}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  showStreamSpiral ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${showStreamSpiral ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">{t('tt.streamSpiralToggle', 'Stream-Spirale zeigen')}</span>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  showStreamSpiral ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                }`}>
                  {showStreamSpiral && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              {onRestartTour && (

                <button
                  onClick={() => {
                    setAccountOpen(false);
                    setShowLogin(false);
                    onRestartTour();
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <CircleHelp className="w-3.5 h-3.5" />
                  {t('tt.restartTour')}
                </button>
              )}


              {onDeleteOpinion && (
                <button
                  onClick={async () => {
                    if (deleteBusy) return;
                    if (!window.confirm(t('tt.deleteOpinionConfirm', 'Delete your opinion and all its conversations?'))) return;
                    setDeleteBusy(true);
                    try {
                      await onDeleteOpinion();
                      setAccountOpen(false);
                      toast.success(t('tt.deleteOpinionDone', 'Your opinion was deleted.'));
                    } catch {
                      toast.error(t('tt.deleteOpinionFailed', 'Could not delete your opinion.'));
                    } finally {
                      setDeleteBusy(false);
                    }
                  }}
                  disabled={deleteBusy}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('tt.deleteOpinion', 'Delete my opinion')}
                </button>
              )}

              {passphraseSwitch && user && (() => {
                let phrase: string | null = null;
                try { phrase = localStorage.getItem('freemind_silent_phrase'); } catch { /* ignore */ }
                return phrase ? (
                  <div className="mt-3 rounded-md border border-border/40 px-2 py-2 text-[11px]">
                    <p className="text-muted-foreground">{t('tt.yourPassphrase', 'Deine Passphrase')}</p>
                    <p className="font-mono text-foreground select-all break-all">{phrase}</p>
                  </div>
                ) : null;
              })()}

              {user && !hideEventChannels && (
                <button
                  onClick={handleSignOut}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('common.signOut', 'Logout')}
                </button>
              )}
              {!hideEventChannels && (passphraseSwitch || (!user && PASSPHRASE_LOGIN_ENABLED)) && (
                <>
                  <button
                    onClick={() => setShowLogin((s) => !s)}
                    className="mt-3 w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    {showLogin ? t('common.cancel') : t('tt.alreadyHavePassphrase')}
                  </button>

                  <AnimatePresence>
                    {showLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-3 pt-3 border-t border-border/30"
                      >
                        <p className="text-[11px] text-muted-foreground mb-2">
                          {t('tt.switchAccountHint')}
                        </p>
                        <AuthForm compact initialMode="login" showModeSwitch={false} onSuccess={() => { setAccountOpen(false); setShowLogin(false); }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
