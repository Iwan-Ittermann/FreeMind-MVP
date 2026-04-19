import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, DoorOpen, Copy, Download, Eye, EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { emailToPassphrase } from '@/lib/passphrase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthForm } from '@/components/AuthForm';

export interface TTNotification {
  id: string;
  type: 'opinion' | 'chat_request' | 'message' | 'request_accepted';
  title: string;
  body?: string;
  unread?: boolean;
}

interface TTHeaderProps {
  topicTitle: string;
  notifications?: TTNotification[];
}

/**
 * Parse markdown-style links `[label](url)` in the topic title.
 * Plain titles (no `[..](..)`) render unchanged.
 */
function parseTitleSegments(title: string): Array<{ label: string; href?: string }> {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: Array<{ label: string; href?: string }> = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title)) !== null) {
    if (m.index > lastIdx) out.push({ label: title.slice(lastIdx, m.index) });
    out.push({ label: m[1], href: m[2] });
    lastIdx = re.lastIndex;
  }
  if (lastIdx < title.length) out.push({ label: title.slice(lastIdx) });
  return out;
}

export function TTHeader({ topicTitle, notifications = [] }: TTHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const phrase = user?.email ? emailToPassphrase(user.email) ?? '' : '';
  const hasUnread = notifications.some((n) => n.unread);

  const titleSegments = useMemo(() => parseTitleSegments(topicTitle), [topicTitle]);

  // Click-outside closes both dropdowns
  useEffect(() => {
    if (!accountOpen && !bellOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (accountOpen && accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
        setShowLogin(false);
      }
      if (bellOpen && bellRef.current && !bellRef.current.contains(target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountOpen, bellOpen]);

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

  return (
    <>
      <div aria-hidden className="absolute top-0 inset-x-0 z-20 h-24 pointer-events-none bg-gradient-to-b from-background/70 via-background/30 to-transparent" />
      <header className="absolute top-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none">
        <div className="flex items-start justify-between pointer-events-auto">
          <span className="text-foreground/90 font-medium tracking-tight lowercase text-base">
            freemind
          </span>
          <div className="flex items-center gap-1">
            <div ref={bellRef}>
              <button
                onClick={() => {
                  setBellOpen((o) => !o);
                  setAccountOpen(false);
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
          <div className="text-[11px] uppercase tracking-widest text-foreground/60">
            {t('tt.discussionQuestion')}
          </div>
          <h1 className="mt-1 text-xl font-serif italic leading-tight text-foreground px-6">
            {titleSegments.map((seg, i) =>
              seg.href ? (
                <a
                  key={i}
                  href={seg.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-foreground/60 underline-offset-4"
                >
                  {seg.label}
                </a>
              ) : (
                <span key={i}>{seg.label}</span>
              ),
            )}
          </h1>
        </div>
      </header>

      {/* Notifications dropdown (header bell) */}
      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{ transformOrigin: '90% 0%' }}
            className="absolute top-12 right-12 z-40 w-72 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border/30">
              <h3 className="text-sm font-semibold">{t('tt.notifications')}</h3>
            </div>
            <div className="max-h-72 overflow-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 px-4">
                  {t('tt.noNotifications')}
                </p>
              ) : (
                <ul className="divide-y divide-border/30">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account dropdown */}
      <AnimatePresence>
        {accountOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{ transformOrigin: '95% 0%' }}
            className="absolute top-12 right-3 z-40 w-72 space-y-2"
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

              {/* Switch account link (no "Konto wechseln" copy) */}
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
                    <AuthForm compact onSuccess={() => { setAccountOpen(false); setShowLogin(false); }} />
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
