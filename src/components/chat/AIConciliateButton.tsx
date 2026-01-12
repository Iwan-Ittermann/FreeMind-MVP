import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIConciliateButtonProps {
  onRequest?: () => void;
}

export function AIConciliateButton({ onRequest }: AIConciliateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleAskAI = async () => {
    setIsLoading(true);
    
    // Mock AI response - in production this would call an AI endpoint
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSuggestion(
      "I notice you both care deeply about this issue, just from different angles. " +
      "Perhaps try focusing on your shared goal rather than the methods. " +
      "What if you asked: 'What outcome would make us both feel heard?'"
    );
    setIsLoading(false);
    onRequest?.();
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              variant="outline"
              className="border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Ask AI to Help
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-purple-900/30 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 max-w-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-purple-300">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">AI Conciliator</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSuggestion(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!suggestion ? (
              <div className="space-y-3">
                <p className="text-sm text-white/70">
                  Let AI analyze your conversation and suggest ways to find common ground.
                </p>
                <Button
                  onClick={handleAskAI}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.div>
                      Analyzing...
                    </span>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Get Suggestions
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-white/40 text-center">
                  Coming soon: Full AI mediation
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-sm text-white/90 leading-relaxed">{suggestion}</p>
                </div>
                <Button
                  onClick={() => setSuggestion(null)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-purple-300 hover:text-purple-200"
                >
                  Ask Another Question
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
