import { UnderstandingIcon } from '@/components/icons/UnderstandingIcon';
import { TTEmojiRating } from '@/components/tt/TTEmojiRating';
import { useTranslation } from 'react-i18next';

/**
 * Temporary internal harness used to capture UI screenshots for the /sogehts page.
 * Not linked anywhere in the product UI.
 */
export default function ShotHarness() {
  const { t } = useTranslation();
  const steps = [
    { value: 0, key: 'tt.understandingStep.notAtAll' },
    { value: 2, key: 'tt.understandingStep.little' },
    { value: 5, key: 'tt.understandingStep.partly' },
    { value: 8, key: 'tt.understandingStep.good' },
    { value: 10, key: 'tt.understandingStep.veryGood' },
  ] as const;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col gap-8">
      <div data-shot="diff" className="w-[360px] rounded-2xl bg-card border border-border p-3">
        <div className="mb-2 text-[11px] text-muted-foreground">{t('tt.opinionDifferenceLabel')}</div>
        <TTEmojiRating value={8} onChange={() => {}} />
      </div>

      <div data-shot="understanding" className="w-[360px] rounded-2xl border border-border bg-muted/60 px-3 pt-2 pb-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UnderstandingIcon className="h-3.5 w-3.5" />
          {t('tt.understandingQuestion')}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {steps.map(({ value, key }) => (
            <button
              key={value}
              type="button"
              className={`min-w-0 rounded-lg border px-0.5 py-1.5 text-[9px] font-semibold leading-tight ${
                value === 8
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
