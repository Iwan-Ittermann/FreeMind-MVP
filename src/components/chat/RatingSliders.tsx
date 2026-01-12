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

  // Calculate zone based on ratings
  const getZoneColor = () => {
    if (empathy > 0.6 && disagreement < 0.4) return 'bg-green-500'; // Green zone
    if (empathy > 0.4 && disagreement < 0.6) return 'bg-yellow-500'; // Yellow zone
    return 'bg-primary'; // Pink zone
  };

  const getZoneLabel = () => {
    if (empathy > 0.6 && disagreement < 0.4) return 'Consensus Zone';
    if (empathy > 0.4 && disagreement < 0.6) return 'Discussion Zone';
    return 'Polarized Zone';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-6"
    >
      <div className="text-center">
        <h3 className="text-sm font-medium text-white mb-1">Rate This Conversation</h3>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getZoneColor()} animate-pulse`} />
          <span className="text-xs text-white/60">{getZoneLabel()}</span>
        </div>
      </div>

      {/* Empathy Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-white/80">Empathy</span>
          </div>
          <span className="text-sm font-mono text-rose-400">
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
        <div className="flex justify-between text-[10px] text-white/40">
          <span>Cold</span>
          <span>Warm</span>
        </div>
      </div>

      {/* Disagreement Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-white/80">Disagreement</span>
          </div>
          <span className="text-sm font-mono text-orange-400">
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
        <div className="flex justify-between text-[10px] text-white/40">
          <span>Aligned</span>
          <span>Opposed</span>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSaveRating}
        disabled={isSaving}
        className="w-full bg-primary hover:bg-primary/90 h-10"
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Saving...
          </>
        ) : hasSaved ? (
          <>
            <Check className="w-4 h-4 mr-2" />
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
