import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Settings, Copy, Download, Eye, EyeOff, X, SlidersHorizontal, MessageSquare, MessageCircle, Globe, Sparkles, CircleHelp, Flag, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { emailToPassphrase } from '@/lib/passphrase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthForm } from '@/components/AuthForm';
import { TopicTitleWithLinks } from '@/components/TopicTitleWithLinks';
import {
  NotificationFilters,
  getGlobalFilters,
  setGlobalFilters,
  getSubscribedTopicIds,
} from '@/lib/tt-notification-prefs';
import { useTTTopics } from '@/hooks/useTTTopics';
import { SINGLE_TOPIC_MODE } from '@/lib/single-topic';

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
}

const FILTER_ITEMS: {
  key: keyof NotificationFilters;
  iconEl: React.ReactNode;
  labelKey: string;
  disabled?: boolean;
}[] = [
  { key: 'newOpinion', iconEl: <Bell className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newOpinion' },
  { key: 'newMessage', iconEl: <MessageSquare className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newMessage' },
  { key: 'newChat', iconEl: <MessageCircle className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newChat' },
  { key: 'newTopic', iconEl: <Globe className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newTopic' },
  { key: 'newHighlight', iconEl: <Sparkles className="w-3.5 h-3.5" />, labelKey: 'tt.notifFilter.newHighlight', disabled: true },
];

const LANGUAGES = [
  { code: 'de', flag: '🇩🇪', labelKey: 'common.german' },
  { code: 'en', flag: '🇬🇧', labelKey: 'common.english' },
];

export function TTHeader({ topicTitle, notifications = [], onMarkAllRead, onRestartTour }: TTHeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [filters, setFilters] = useState<NotificationFilters>(getGlobalFilters);
  const accountRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  const phrase = user?.email ? emailToPassphrase(user.email) ?? '' : '';
  const hasUnread = notifications.some((n) => n.unread);
  const currentLanguage = LANGUAGES.find((lang) => i18n.language.startsWith(lang.code)) ?? LANGUAGES[0];

  const { data: topicList = [] } = useTTTopics();
  const topicTitleMap = new Map(topicList.map((tp) => [tp.id, tp.title]));
  const topicCodeMap = new Map(topicList.map((tp) => [tp.id, tp.short_code ?? tp.id]));

  // Subscribed topics — refresh on subscription change events
  const [subscribedIds, setSubscribedIds] = useState<string[]>(() => getSubscribedTopicIds());
  useEffect(() => {
    const sync = () => setSubscribedIds(getSubscribedTopicIds());
    sync();
    window.addEventListener('tt:subscription-changed', sync);
    return () => window.removeEventListener('tt:subscription-changed', sync);
  }, []);
  const subscribedTopics = subscribedIds
    .map((id) => ({ id, title: topicTitleMap.get(id) ?? id, code: topicCodeMap.get(id) ?? id }))
    .filter((tp) => tp.title);

  const groupedNotifications = (() => {
    const groups = new Map<string, { title: string; items: typeof notifications }>();
    for (const n of notifications) {
      const key = n.topicId ?? '__other__';
      const title = n.topicId ? (topicTitleMap.get(n.topicId) ?? t('tt.otherTopic', 'Other')) : t('tt.otherTopic', 'Other');
      if (!groups.has(key)) groups.set(key, { title, items: [] });
      groups.get(key)!.items.push(n);
    }
    return Array.from(groups.values());
  })();

  useEffect(() => {
    if (!accountOpen && !bellOpen && !languageOpen) return;
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
      if (languageOpen && languageRef.current && !languageRef.current.contains(target) && (!languageDropdownRef.current || !languageDropdownRef.current.contains(target))) {
        setLanguageOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountOpen, bellOpen, languageOpen]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phrase) return;
    await navigator.clipboard.writeText(phrase);
    toast.success(t('auth.passphraseCopied'));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phrase) return;
    const content = `FreeMind Passphrase\n==================\n${phrase}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freemind-passphrase-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFilter = (key: keyof NotificationFilters) => {
    setFilters((f) => {
      const next = { ...f, [key]: !f[key] };
      setGlobalFilters(next);
      window.dispatchEvent(new CustomEvent('tt:subscription-changed'));
      return next;
    });
  };

  return (
    <>
      <div aria-hidden className="absolute top-0 inset-x-0 z-20 h-24 pointer-events-none bg-gradient-to-b from-background/70 via-background/30 to-transparent" />
      <header className="absolute top-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none">
        <div className="flex items-start justify-between pointer-events-auto">
          <span className="text-foreground/90 font-medium tracking-tight lowercase text-base">
            freemind
          </span>
          <div className="flex items-center gap-1">
            {!SINGLE_TOPIC_MODE && (
              <div ref={languageRef}>
                <button
                  onClick={() => {
                    setLanguageOpen((o) => !o);
                    setBellOpen(false);
                    setAccountOpen(false);
                    setFiltersOpen(false);
                    setShowLogin(false);
                  }}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
                  aria-label={t('common.language')}
                >
                  <span className="text-base leading-none" aria-hidden>{currentLanguage.flag}</span>
                </button>
              </div>
            )}
            <div ref={bellRef}>
              <button
                onClick={() => {
                  const wasOpen = bellOpen;
                  setBellOpen((o) => !o);
                  setAccountOpen(false);
                  setLanguageOpen(false);
                  setFiltersOpen(false);
                  if (!wasOpen && onMarkAllRead) onMarkAllRead();
                }}
                className="relative h-8 w-8 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
                aria-label={t('tt.notifications')}
              >
                <Bell className="w-4 h-4" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
            </div>
            <div ref={accountRef}>
              <button
                onClick={() => {
                  setAccountOpen((o) => !o);
                  setBellOpen(false);
                  setLanguageOpen(false);
                  setShowLogin(false);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
                aria-label={t('tt.menu')}
              >
                {accountOpen ? <X className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Topic question */}
        <div className="mt-3 text-center pointer-events-auto">
          <h1 className="text-xl font-serif italic leading-tight text-foreground px-6">
            <TopicTitleWithLinks title={topicTitle} />
          </h1>
        </div>
      </header>

      {/* Language dropdown */}
      <AnimatePresence>
        {languageOpen && (
          <motion.div
            ref={languageDropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{ transformOrigin: '90% 0%' }}
            className="absolute top-12 right-[5.75rem] z-40 w-44 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">{t('common.language')}</h3>
            </div>
            <div className="p-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setLanguageOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                    currentLanguage.code === lang.code
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden>{lang.flag}</span>
                  <span>{t(lang.labelKey)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className={`p-1 rounded-md transition-colors ${filtersOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label={t('tt.notifFilterTitle')}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
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

            {/* Subscribed topics — hidden in single-topic mode */}
            {!SINGLE_TOPIC_MODE && (
              <div className="border-b border-border/30">
                <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold bg-muted/30">
                  {t('tt.subscribedTopics')}
                </div>
                {subscribedTopics.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-muted-foreground">
                    {t('tt.noSubscribedTopics')}
                  </p>
                ) : (
                  <div className="px-3 py-2 flex flex-wrap gap-1.5">
                    {subscribedTopics.map((tp) => (
                      <button
                        key={tp.id}
                        onClick={() => {
                          navigate(`/${tp.code}`);
                          setBellOpen(false);
                        }}
                        className="text-[11px] rounded-full px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-foreground/85 max-w-[14rem] truncate transition-colors"
                        title={tp.title}
                      >
                        {tp.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="max-h-72 overflow-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 px-4">
                  {t('tt.noNotifications')}
                </p>
              ) : (
                <div>
                  {groupedNotifications.map((group) => (
                    <div key={group.title} className="border-b border-border/30 last:border-b-0">
                      <div className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold bg-muted/30">
                        {group.title}
                      </div>
                      <ul className="divide-y divide-border/20">
                        {group.items.map((n) => (
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
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <div className="text-xs text-muted-foreground mb-2">
                {t('tt.yourPassphrase')}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 px-3 py-1.5 rounded-full bg-muted text-xs font-mono truncate">
                  {showPhrase ? phrase || '—' : '••••••••••••'}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowPhrase((s) => !s);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-muted"
                  aria-label={showPhrase ? 'Hide' : 'Show'}
                >
                  {showPhrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button onClick={handleCopy} className="flex-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Copy">
                  <Copy className="w-3.5 h-3.5 mx-auto" />
                </button>
                <button onClick={handleDownload} className="flex-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Download">
                  <Download className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
