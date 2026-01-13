import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Lock, Unlock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const CONFIG_PASSWORD = 'Wonderful';

export function ConfigPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const queryClient = useQueryClient();

  const handleUnlock = () => {
    if (password === CONFIG_PASSWORD) {
      setIsUnlocked(true);
      setPassword('');
      toast.success('Config unlocked');
    } else {
      toast.error('Incorrect password');
      setPassword('');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database? This will delete ALL opinions, chats, messages, ratings, and requests. This cannot be undone!')) {
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.functions.invoke('reset-database', {
        body: { password: CONFIG_PASSWORD },
      });

      if (error) throw error;

      toast.success('Database reset successfully');
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset database');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
      >
        <Settings className="w-4 h-4 text-white/30 hover:text-white/50" />
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-10 left-0 bg-black/95 border border-white/10 rounded-lg p-4 min-w-[280px] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                Configuration
              </h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {!isUnlocked ? (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-10"
                />
                <Button
                  onClick={handleUnlock}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 h-10"
                >
                  Unlock
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleResetDatabase}
                  disabled={isResetting}
                  variant="destructive"
                  className="w-full h-10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isResetting ? 'Resetting...' : 'Reset Database'}
                </Button>
                <Button
                  onClick={handleLock}
                  variant="ghost"
                  className="w-full text-white/60 hover:text-white hover:bg-white/5 h-9 text-sm"
                >
                  <Lock className="w-3 h-3 mr-2" />
                  Lock Config
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
