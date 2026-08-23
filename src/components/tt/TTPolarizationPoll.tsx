import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export type PolarizationWave = 'pre' | 'post';

// v2: earlier builds had a "später" button that stored a permanent dismissal.
// Versioning the key makes the poll reappear for everyone without a DB answer.
const dismissKey = (wave: PolarizationWave) => `tt:polarization-dismissed:v2:${wave}`;

/**
 * Two-item affective polarization poll (0–100), no default values.
 * Wave "pre" is shown right after the user submitted their opinion,
 * wave "post" on the last day of the discussion.
 */
export function TTPolarizationPoll({
  userId,
  hasOwnOpinion,
  discussionEndAt,
}: {
  userId?: string | null;
  hasOwnOpinion: boolean;
  discussionEndAt?: Date | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [least, setLeast] = useState<number | null>(null);
  const [most, setMost] = useState<number | null>(null);
  const [leastNA, setLeastNA] = useState(false);
  const [mostNA, setMostNA] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissedWaves, setDismissedWaves] = useState<string[]>(() =>
    (['pre', 'post'] as PolarizationWave[]).filter((w) => localStorage.getItem(dismissKey(w)) === '1'),
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [saveError, setSaveError] = useState(false);

  const { data: done, isLoading: doneLoading } = useQuery({
    queryKey: ['tt-polarization', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polarization_responses')
        .select('wave')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? []).map((r) => String(r.wave));
    },
  });


  const isLastDay = useMemo(() => {
    const end = discussionEndAt?.getTime();
    if (!end) return false;
    return now >= end - 24 * 60 * 60 * 1000 && now <= end;
  }, [discussionEndAt, now]);

  const wave: PolarizationWave | null = useMemo(() => {
    // Never render before the already-answered waves are known — otherwise the
    // poll flashes for one render and disappears again.
    if (!userId || !hasOwnOpinion || !done) return null;
    if (isLastDay && !done.includes('post')) return 'post';
    if (!done.includes('pre')) return 'pre';
    return null;
  }, [userId, hasOwnOpinion, isLastDay, done]);

  // No preset values for either wave.
  useEffect(() => {
    if (!wave) return;
    setLeast(null);
    setMost(null);
    setLeastNA(false);
    setMostNA(false);
    setSaveError(false);
  }, [wave]);

  if (doneLoading || !wave || dismissedWaves.includes(wave)) return null;

  const leastAnswered = leastNA || least !== null;
  const mostAnswered = mostNA || most !== null;

  const save = async () => {
    if (!leastAnswered || !mostAnswered || !userId) return;
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase.from('polarization_responses').insert({
      user_id: userId,
      wave,
      least_liked_score: leastNA ? null : least,
      most_liked_score: mostNA ? null : most,
    });
    setSaving(false);
    if (error) {
      setSaveError(true);
      return;
    }
    localStorage.setItem(dismissKey(wave), '1');
    setDismissedWaves((prev) => [...prev, wave]);
    queryClient.invalidateQueries({ queryKey: ['tt-polarization', userId] });
  };


  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-2xl border border-border/50 bg-card/95 p-5 shadow-2xl">
        <h2 className="text-center text-lg font-semibold text-foreground">{t('tt.polarization.title')}</h2>


        <Item
          label={t('tt.polarization.leastLiked')}
          value={least}
          onChange={(v) => { setLeast(v); setLeastNA(false); }}
          na={leastNA}
          onToggleNA={() => { setLeastNA(true); setLeast(null); }}
          naLabel={t('tt.polarization.noAnswer')}
          minLabel={t('tt.polarization.veryNegative')}
          maxLabel={t('tt.polarization.veryPositive')}
        />
        <Item
          label={t('tt.polarization.mostLiked')}
          value={most}
          onChange={(v) => { setMost(v); setMostNA(false); }}
          na={mostNA}
          onToggleNA={() => { setMostNA(true); setMost(null); }}
          naLabel={t('tt.polarization.noAnswer')}
          minLabel={t('tt.polarization.veryNegative')}
          maxLabel={t('tt.polarization.veryPositive')}
        />

        {saveError && (
          <p className="mt-4 text-center text-xs text-destructive">{t('tt.polarization.saveError')}</p>
        )}

        <div className="mt-6 flex justify-center">
          <Button size="sm" disabled={saving || !leastAnswered || !mostAnswered} onClick={save}>
            {saving ? '…' : t('tt.polarization.submit')}
          </Button>
        </div>

      </div>
    </div>
  );
}

function Item({
  label,
  value,
  onChange,
  na,
  onToggleNA,
  naLabel,
  minLabel,
  maxLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  na: boolean;
  onToggleNA: () => void;
  naLabel: string;
  minLabel: string;
  maxLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pick = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(Math.round(ratio * 100));
  };

  return (
    <div className="mt-7">
      <p className="text-center text-lg font-medium leading-snug text-foreground">{label}</p>

      <div
        className={`relative mt-5 h-6 cursor-pointer touch-none select-none ${na ? 'opacity-40' : ''}`}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && pick(e.clientX)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <div
          ref={trackRef}
          className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/70"
        />
        {!na && value !== null && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${value}%` }}
          />
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <p className="mt-1 text-center text-sm font-semibold tabular-nums text-primary">
        {na || value === null ? '–' : value}
      </p>

      <div className="mt-1 flex justify-start">
        <button
          type="button"
          onClick={onToggleNA}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          aria-pressed={na}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
              na ? 'border-primary' : 'border-muted-foreground/50'
            }`}
          >
            {na && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </span>
          {naLabel}
        </button>
      </div>
    </div>
  );
}
