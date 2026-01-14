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
  initialEmpathy = 0,
  initialDisagreement = 50,
  onSubmitRating,
  isSaving = false,
}: RatingSlidersProps) {
  // Empathy: -50 to +50, default 0
  const [empathy, setEmpathy] = useState(initialEmpathy);
  // Disagreement: 0 to 100, default 50
  const [disagreement, setDisagreement] = useState(initialDisagreement);
  const [hasSaved, setHasSaved] = useState(false);

  const handleSaveRating = () => {
    onSubmitRating?.(empathy, disagreement);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  // Bridging score = empathy × disagreement
  // Range: -5000 to +5000
  const bridgingScore = empathy * disagreement;

  const getZoneLabel = () => {
    if (bridgingScore > 2500) return { label: 'Bridge Builder', color: 'bg-green-500' };
    if (bridgingScore >= 0) return { label: 'Discussion Zone', color: 'bg-orange-500' };
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

      {/* Empathy Slider: -50 to +50 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-white/70">Empathy</span>
          </div>
          <span className="text-xs font-mono text-rose-400/80">
            {empathy}
          </span>
        </div>
        {/* Position indicator for 0 */}
        <div className="relative">
          <Slider
            value={[empathy + 50]} // Convert -50/+50 to 0-100 for slider
            onValueChange={(v) => setEmpathy(v[0] - 50)} // Convert back
            max={100}
            step={1}
            disabled={isSaving}
            className="[&_[role=slider]]:bg-rose-400 [&_[role=slider]]:border-rose-400 [&_.bg-primary]:bg-rose-400/30"
          />
          {/* Zero marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/40 pointer-events-none" />
        </div>
        <div className="flex justify-between text-[10px] text-white/30">
          <span>Hostile</span>
          <span className="text-white/50">0</span>
          <span>Empathetic</span>
        </div>
      </div>

      {/* Disagreement Slider: 0 to 100 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-white/70">Disagreement</span>
          </div>
          <span className="text-xs font-mono text-orange-400/80">
            {disagreement}
          </span>
        </div>
        <Slider
          value={[disagreement]}
          onValueChange={(v) => setDisagreement(v[0])}
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
