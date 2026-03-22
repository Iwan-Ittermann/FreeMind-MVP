import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Save, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface RatingSlidersProps {
  initialEmpathy?: number;
  onSubmitRating?: (empathy: number) => void;
  isSaving?: boolean;
}

export function RatingSliders({
  initialEmpathy = 0,
  onSubmitRating,
  isSaving = false,
}: RatingSlidersProps) {
  const { t } = useTranslation();
  const [respect, setRespect] = useState(initialEmpathy);
  const [hasSaved, setHasSaved] = useState(false);

  const handleSaveRating = () => {
    onSubmitRating?.(respect);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      <h3 className="text-sm font-medium text-foreground">{t('floatingChat.rateConversation')}</h3>

      {/* Respect Slider: -50 to +50 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-muted-foreground">{t('floatingChat.respect')}</span>
          </div>
          <span className="text-xs font-mono text-rose-400/80">
            {respect}
          </span>
        </div>
        <div className="relative">
          <Slider
            value={[respect + 50]}
            onValueChange={(v) => setRespect(v[0] - 50)}
            max={100}
            step={1}
            disabled={isSaving}
            className="[&_[role=slider]]:bg-rose-400 [&_[role=slider]]:border-rose-400 [&_.bg-primary]:bg-rose-400/30"
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-foreground/40 pointer-events-none" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{t('floatingChat.disrespectful')}</span>
          <span>0</span>
          <span>{t('floatingChat.respectful')}</span>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSaveRating}
        disabled={isSaving}
        variant="outline"
        className="w-full border-border bg-muted hover:bg-muted/80 text-foreground h-10"
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2" />
            {t('floatingChat.saving')}
          </>
        ) : hasSaved ? (
          <>
            <Check className="w-4 h-4 mr-2 text-green-400" />
            {t('floatingChat.saved')}
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            {t('floatingChat.saveRating')}
          </>
        )}
      </Button>
    </motion.div>
  );
}
