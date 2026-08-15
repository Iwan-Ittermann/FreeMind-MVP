import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TTEmojiRating } from './TTEmojiRating';
import { useDisagreementRating } from '@/hooks/useOpinionRating';

interface TTRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  myOpinionId: string | null;
  target: { id: string; text: string } | null;
  onSaved?: (opinionId: string, value: number) => void;
}

/**
 * Popup for rating the opinion difference (5 steps) with explicit confirm.
 */
export function TTRatingDialog({
  open,
  onOpenChange,
  topicId,
  myOpinionId,
  target,
  onSaved,
}: TTRatingDialogProps) {
  const { t } = useTranslation();
  const { disagreement, setDisagreementLocal, saveNow, hasSavedRating, isSaving, canRate } =
    useDisagreementRating(topicId, myOpinionId, target?.id ?? null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setTouched(false);
  }, [target?.id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">{t('tt.opinionDifferenceLabel')}</DialogTitle>
        </DialogHeader>

        {target && (
          <p className="text-sm text-foreground/90 leading-snug text-center px-1">{target.text}</p>
        )}

        <div className="mt-2">
          <TTEmojiRating
            value={disagreement}
            onChange={(v) => {
              setDisagreementLocal(v);
              setTouched(true);
            }}
            disabled={!canRate}
            unset={!touched && !hasSavedRating}
          />
        </div>

        {!canRate ? (
          <p className="text-[11px] text-muted-foreground text-center">{t('tt.postFirstToRate')}</p>
        ) : (
          <div className="mt-2 flex justify-center">
            <Button
              size="sm"
              className="rounded-full h-8 text-xs px-6"
              disabled={(!touched && !hasSavedRating) || isSaving}
              onClick={async () => {
                try {
                  await saveNow();
                  onSaved?.(target!.id, disagreement);
                  onOpenChange(false);
                } catch {
                  toast.error(t('tt.ratingFailed'));
                }
              }}
            >
              {isSaving ? t('floatingChat.saving') : t('common.ok', 'OK')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
