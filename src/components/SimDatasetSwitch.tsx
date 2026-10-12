import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SimDataset } from '@/hooks/useSimDataset';

export function SimDatasetSwitch({ value, onChange, className }: { value: SimDataset; onChange: (v: SimDataset) => void; className?: string }) {
  const { t } = useTranslation();
  const options: SimDataset[] = ['social', 'august'];
  return (
    <div role="radiogroup" aria-label={t('replay.datasetLabel')} className={cn('inline-flex max-w-full rounded-full border border-foreground/25 bg-background/70 p-0.5 backdrop-blur', className)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors whitespace-nowrap',
            value === o ? 'bg-foreground text-background' : 'text-foreground/75 hover:text-foreground')}
        >
          {t(o === 'social' ? 'replay.datasetSocial' : 'replay.datasetAugust')}
        </button>
      ))}
    </div>
  );
}
