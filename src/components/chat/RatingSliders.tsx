import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Swords, Save, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface RatingSlidersProps {
  initialEmpathy?: number;
  initialDisagreement?: number;
  onSubmitRating?: (empathy: number, disagreement: number) => void;
  isSaving?: boolean;
}

export function RatingSliders({
  initialEmpathy = 0.5,
  initialDisagreement = 0.5,
  onSubmitRating,
  isSaving = false,
}: RatingSlidersProps) {
  const [empathy, setEmpathy] = useState(initialEmpathy);
  const [disagreement, setDisagreement] = useState(initialDisagreement);
  const [hasSaved, setHasSaved] = useState(false);

  const handleSaveRating = () => {
    onSubmitRating?.(empathy, disagreement);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const getZoneLabel = () => {
    if (empathy > 0.6 && disagreement < 0.4) return { label: 'Consensus Zone', color: 'bg-green-500' };
    if (empathy > 0.4 && disagreement < 0.6) return { label: 'Discussion Zone', color: 'bg-yellow-500' };
    return { label: 'Polarized Zone', color: 'bg-primary' };
  };

  const zone = getZoneLabel();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Header with zone indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Rate This Conversation</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${zone.color}`} />
          <span className="text-xs text-white/50">{zone.label}</span>
        </div>
      </div>

      {/* Empathy Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-white/70">Empathy</span>
          </div>
          <span className="text-xs font-mono text-rose-400/80">
            {Math.round(empathy * 100)}%
          </span>
        </div>
        <Slider
          value={[empathy * 100]}
          onValueChange={(v) => setEmpathy(v[0] / 100)}
          max={100}
          step={1}
          disabled={isSaving}
          className="[&_[role=slider]]:bg-rose-400 [&_[role=slider]]:border-rose-400 [&_.bg-primary]:bg-rose-400/30"
        />
        <div className="flex justify-between text-[10px] text-white/30">
          <span>Cold</span>
          <span>Warm</span>
        </div>
      </div>

      {/* Disagreement Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-white/70">Disagreement</span>
          </div>
          <span className="text-xs font-mono text-orange-400/80">
            {Math.round(disagreement * 100)}%
          </span>
        </div>
        <Slider
          value={[disagreement * 100]}
          onValueChange={(v) => setDisagreement(v[0] / 100)}
          max={100}
          step={1}
          disabled={isSaving}
          className="[&_[role=slider]]:bg-orange-400 [&_[role=slider]]:border-orange-400 [&_.bg-primary]:bg-orange-400/30"
        />
        <div className="flex justify-between text-[10px] text-white/30">
          <span>Aligned</span>
          <span>Opposed</span>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSaveRating}
        disabled={isSaving}
        variant="outline"
        className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-white h-10"
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Saving...
          </>
        ) : hasSaved ? (
          <>
            <Check className="w-4 h-4 mr-2 text-green-400" />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Rating
          </>
        )}
      </Button>
    </motion.div>
  );
}