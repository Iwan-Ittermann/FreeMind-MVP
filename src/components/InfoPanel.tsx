import { MessageSquare, MessagesSquare, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface InfoPanelProps {
  question: string;
  opinionCount: number;
}

export function InfoPanel({ question, opinionCount }: InfoPanelProps) {
  const steps = [
    { icon: MessageSquare, action: 'STATE', description: 'your mind' },
    { icon: MessagesSquare, action: 'CHAT', description: 'with others' },
    { icon: Star, action: 'RATE', description: 'your chat' },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Question - visible on mobile only (desktop shows in header) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="md:hidden"
      >
        <h2 className="text-2xl font-medium leading-tight text-white">
          {question}
        </h2>
        <p className="mt-2 text-white/60 text-sm">
          {opinionCount} opinions
        </p>
      </motion.div>

      {/* Opinion count for desktop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="hidden md:block"
      >
        <p className="text-white/60 text-sm">
          {opinionCount} opinions shared
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 md:gap-4"
      >
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-3 text-white/60"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0">
              <step.icon size={16} className="md:w-[18px] md:h-[18px]" />
            </div>
            <span className="text-sm">
              <span className="font-medium text-white">{step.action}</span>
              <span className="ml-3">{step.description}</span>
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
