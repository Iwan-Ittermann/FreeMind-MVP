import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClientIP } from '@/hooks/useClientIP';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const opinionSchema = z.object({
  text: z.string()
    .min(10, 'Opinion must be at least 10 characters')
    .max(500, 'Opinion must be less than 500 characters'),
});

interface SubmitOpinionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  onSuccess?: () => void;
  hasExistingOpinion?: boolean;
}

export function SubmitOpinionDialog({
  open,
  onOpenChange,
  topicId,
  onSuccess,
  hasExistingOpinion,
}: SubmitOpinionDialogProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const result = opinionSchema.safeParse({ text });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const ipAddress = await getClientIP();

      const { error: submitError } = await supabase.rpc('submit_opinion', {
        _topic_id: topicId,
        _text: text.trim(),
        _ip_address: ipAddress,
      });

      if (submitError) throw submitError;

      toast.success('Opinion submitted!');
      setText('');
      onSuccess?.();
    } catch (err: any) {
      const message = err.message || 'Failed to submit opinion';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasExistingOpinion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('opinion.alreadySubmittedTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('opinion.alreadySubmittedDesc')}
          </p>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('opinion.shareYourOpinion')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder={t('opinion.whatDoYouThink')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] resize-none bg-background"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {text.length}/500
            </span>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || text.length < 10}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t('common.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
