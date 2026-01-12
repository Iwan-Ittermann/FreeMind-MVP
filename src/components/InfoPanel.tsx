import { MessageSquare, Heart, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface InfoPanelProps {
  question: string;
  opinionCount: number;
}

export function InfoPanel({ question, opinionCount }: InfoPanelProps) {
  const steps = [
    { icon: MessageSquare, text: 'Select opinion to chat with' },
    { icon: Heart, text: 'Rate Empathy and Disagreement' },
    { icon: RefreshCw, text: 'Graph is updated. Reach the middle!' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Logo */}
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-medium text-white"
      >
        freemind
      </motion.h1>

      {/* Question */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
      <h2 className="text-3xl md:text-4xl font-medium leading-tight text-white">
          {question}
        </h2>
        <p className="mt-2 text-white/60">
          {opinionCount} opinions
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 mt-4"
      >
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-3 text-white/60"
          >
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <step.icon size={18} />
            </div>
            <span className="text-sm">{step.text}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
