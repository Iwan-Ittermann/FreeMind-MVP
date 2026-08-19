import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export type PolarizationWave = 'pre' | 'post';

const dismissKey = (wave: PolarizationWave) => `tt:polarization-dismissed:${wave}`;

/**
 * Two-item affective polarization poll (0–100).
 * Wave "pre" is shown right after the user submitted their opinion,
 * wave "post" on the last day of the discussion (no preset values).
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
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { data: done = [] } = useQuery({
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
    if (!userId || !hasOwnOpinion) return null;
    if (isLastDay && !done.includes('post')) return 'post';
    if (!done.includes('pre')) return 'pre';
    return null;
  }, [userId, hasOwnOpinion, isLastDay, done]);

  // Wave 1 starts at the neutral midpoint, wave 2 has no preset value.
  useEffect(() => {
    if (!wave) return;
    setLeast(wave === 'pre' ? 50 : null);
    setMost(wave === 'pre' ? 50 : null);
  }, [wave]);

  const hidden = wave ? localStorage.getItem(dismissKey(wave)) === '1' : true;
  // Re-read after a dismiss action.
  void dismissed;

  if (!wave || hidden) return null;

  const save = async () => {
    if (least === null || most === null || !userId) return;
    setSaving(true);
    const { error } = await supabase.from('polarization_responses').insert({
      user_id: userId,
      wave,
      least_liked_score: least,
      most_liked_score: most,
    });
    setSaving(false);
    if (error) return;
    queryClient.invalidateQueries({ queryKey: ['tt-polarization', userId] });
  };

  const skip = () => {
    localStorage.setItem(dismissKey(wave), '1');
    setDismissed((n) => n + 1);
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-[380px] rounded-2xl border border-border/50 bg-card/95 p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-foreground">{t('tt.polarization.title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('tt.polarization.intro')}</p>

        <Item
          label={t('tt.polarization.leastLiked')}
          value={least}
          onChange={setLeast}
          minLabel={t('tt.polarization.veryNegative')}
          maxLabel={t('tt.polarization.veryPositive')}
        />
        <Item
          label={t('tt.polarization.mostLiked')}
          value={most}
          onChange={setMost}
          minLabel={t('tt.polarization.veryNegative')}
          maxLabel={t('tt.polarization.veryPositive')}
        />

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
            {t('tt.polarization.later')}
          </button>
          <Button size="sm" disabled={saving || least === null || most === null} onClick={save}>
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
  minLabel,
  maxLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">{label}</p>
        <span className="text-sm font-semibold tabular-nums text-primary">
          {value === null ? '–' : value}
        </span>
      </div>
      <Slider
        className="mt-3"
        min={0}
        max={100}
        step={1}
        value={[value ?? 50]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0 · {minLabel}</span>
        <span>{maxLabel} · 100</span>
      </div>
    </div>
  );
}
