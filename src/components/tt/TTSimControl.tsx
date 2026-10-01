import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Square, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface SimStatus {
  running: boolean;
  runningUntil: string | null;
  runsToday: number;
  runsLeft: number;
  pausedReason: string | null;
  error?: string;
}

async function callControl(action: 'status' | 'start' | 'stop'): Promise<SimStatus | null> {
  const { data, error } = await supabase.functions.invoke('sim-control', {
    body: { action },
  });
  if (error) throw error;
  return (data as SimStatus) ?? null;
}

/**
 * Public play button for the /sim AI discussion simulation.
 * Anyone may start a run; the server enforces 90s runs and the daily limit.
 */
export function TTSimControl() {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['sim-status'],
    queryFn: () => callControl('status'),
    refetchInterval: 3_000,
    staleTime: 0,
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const running = !!data?.running && !!data.runningUntil;
  const remainingMs = running ? Math.max(0, new Date(data!.runningUntil!).getTime() - now) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const runsLeft = data?.runsLeft ?? 0;

  const act = async (action: 'start' | 'stop') => {
    setBusy(true);
    try {
      await callControl(action);
    } catch {
      /* status poll recovers */
    } finally {
      await refetch();
      setBusy(false);
    }
  };

  return (
    <div className="absolute right-3 bottom-[150px] z-30 pointer-events-auto">
      <div className="flex flex-col items-end gap-1.5 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-lg px-3 py-2.5">
        {running ? (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {t('tt.simRunning', 'Simulation läuft')} · {countdown}
              </span>
              <button
                type="button"
                onClick={() => act('stop')}
                disabled={busy}
                className="p-1.5 rounded-full bg-muted hover:bg-muted/70 text-foreground transition-colors"
                aria-label={t('tt.simStop', 'Stoppen')}
              >
                <Square className="w-3 h-3" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => act('start')}
            disabled={busy || runsLeft <= 0}
            className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t('tt.simPlay', 'Simulation starten')}
          </button>
        )}
        <span className="text-[10px] text-muted-foreground">
          {runsLeft > 0
            ? t('tt.simRunsLeft', '{{count}} von 4 Läufen heute übrig', { count: runsLeft })
            : t('tt.simDailyLimit', 'Tageslimit erreicht — morgen geht es weiter')}
        </span>
      </div>
    </div>
  );
}
