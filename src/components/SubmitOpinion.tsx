import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const opinionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, { message: 'Opinion must be at least 10 characters' })
    .max(500, { message: 'Opinion must be less than 500 characters' }),
});

interface SubmitOpinionProps {
  topicId: string;
  onSuccess?: () => void;
  hasExistingOpinion?: boolean;
}

export function SubmitOpinion({ topicId, onSuccess, hasExistingOpinion = false }: SubmitOpinionProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const result = opinionSchema.safeParse({ text });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!user) {
      setError('You must be signed in to submit an opinion');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase.from('opinions').insert({
        topic_id: topicId,
        user_id: user.id,
        text: result.data.text,
      });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError('You already submitted an opinion for this topic');
        } else {
          setError(insertError.message);
        }
      } else {
        toast.success('Opinion submitted! It will appear on the graph.');
        setText('');
        setIsOpen(false);
        setSubmitted(true);
        onSuccess?.();
      }
    } catch (err) {
      setError('Failed to submit opinion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  const isDisabled = hasExistingOpinion || submitted;

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
              disabled={isDisabled}
              className={`h-11 md:h-10 px-5 ${
                isDisabled 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isDisabled ? 'Opinion Added' : 'Add Your Opinion'}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white/5 border border-white/10 rounded-lg p-4 w-full"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Share Your Opinion</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's your view on this topic? Be clear and concise..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[120px] md:min-h-[100px] resize-none text-base"
                maxLength={500}
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">
                  {text.length}/500 characters
                </span>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || text.trim().length < 10}
                className="w-full bg-primary hover:bg-primary/90 h-12 md:h-10 text-base md:text-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                    Submitting...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Opinion
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
