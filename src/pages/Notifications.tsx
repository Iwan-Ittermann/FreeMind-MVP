import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, MessageCircle, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStoredNotifications, StoredNotification } from '@/hooks/useStoredNotifications';
import { useEventTopic } from '@/hooks/useEventTopic';

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function TypeIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4';
  if (type === 'message') return <MessageSquare className={cls} />;
  if (type === 'chat_request') return <MessageCircle className={cls} />;
  if (type === 'opinion') return <Sparkles className={cls} />;
  return <Bell className={cls} />;
}

function Row({ n }: { n: StoredNotification }) {
  return (
    <Link
      to={n.link || '/go'}
      className={`flex gap-3 px-4 py-3 border-b border-border/20 transition-colors hover:bg-muted/40 ${
        n.read_at ? '' : 'bg-primary/5'
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${n.read_at ? 'text-muted-foreground' : 'text-primary'}`}>
        <TypeIcon type={n.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${n.read_at ? 'text-foreground/80' : 'font-semibold text-foreground'}`}>
          {n.title}
        </p>
        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1">
          {fmtWhen(n.created_at)}
        </p>
      </div>
      {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </Link>
  );
}

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const { topic } = useEventTopic('real');
  const { notifications, unreadCount, loading, markAllRead } = useStoredNotifications(topic?.id ?? null);

  useEffect(() => {
    document.title = 'Benachrichtigungen — freemind';
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5">
          <Link
            to="/go"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/80 hover:text-foreground"
            aria-label="Zurück zur Diskussion"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex-1 text-sm font-semibold">
            Benachrichtigungen
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Alle gelesen
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg pb-16">
        {!authLoading && !user ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            Bitte melde dich in der Diskussion an, um deine Benachrichtigungen zu sehen.
          </p>
        ) : loading ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">Lädt…</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            Noch keine Benachrichtigungen.
          </p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                <Row n={n} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
