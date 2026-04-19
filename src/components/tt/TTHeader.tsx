import { useState } from 'react';
import { Bell, DoorOpen, Copy, Download, RefreshCw, Eye, EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { generatePassphrase, emailToPassphrase } from '@/lib/passphrase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TTHeaderProps {
  hasUnread?: boolean;
  videoUrl?: string | null;
  topicTitle: string;
  onBellClick?: () => void;
}

export function TTHeader({ hasUnread = false, videoUrl, topicTitle, onBellClick }: TTHeaderProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);

  const phrase = user?.email ? emailToPassphrase(user.email) ?? '' : '';

  const handleCopy = async () => {
    if (!phrase) return;
    await navigator.clipboard.writeText(phrase);
    toast.success(t('auth.passphraseCopied'));
  };

  const handleDownload = () => {
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

  const handleRegenerate = () => {
    const newPhrase = generatePassphrase();
    navigator.clipboard.writeText(newPhrase);
    toast.info(t('tt.regenerateHint', { phrase: newPhrase }));
  };

  return (
    <>
      <header className="absolute top-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none">
        <div className="flex items-start justify-between pointer-events-auto">
          <span className="text-foreground/90 font-medium tracking-tight lowercase text-base">
            freemind
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onBellClick}
              className="relative h-8 w-8 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
              aria-label={t('tt.notifications')}
            >
              <Bell className="w-4 h-4" />
              {hasUnread && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
            <button
              onClick={() => setOpen((o) => !o)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
              aria-label={t('tt.menu')}
            >
              {open ? <X className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Topic question */}
        <div className="mt-3 text-center pointer-events-auto">
          <div className="text-[11px] uppercase tracking-widest text-foreground/60">
            {t('tt.discussionQuestion')}
          </div>
          <h1 className="mt-1 text-xl font-serif italic leading-tight text-foreground px-6">
            {topicTitle.split(/\b(Video|video)\b/).map((part, i) =>
              part.toLowerCase() === 'video' && videoUrl ? (
                <a
                  key={i}
                  href={videoUrl}
                  className="underline decoration-foreground/60 underline-offset-4"
                >
                  {part}
                </a>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </h1>
        </div>
      </header>

      {/* Dropdown panels */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-12 right-3 z-40 w-64 space-y-2"
          >
            {/* Passphrase panel */}
            <div className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">
                {t('tt.yourPassphrase')}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 px-3 py-1.5 rounded-full bg-muted text-xs font-mono truncate">
                  {showPhrase ? phrase || '—' : '••••••••••••'}
                </div>
                <button onClick={() => setShowPhrase((s) => !s)} className="p-1.5 rounded-full hover:bg-muted">
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
                <button onClick={handleRegenerate} className="flex-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Regenerate">
                  <RefreshCw className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                }}
                className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground"
              >
                {t('tt.signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
