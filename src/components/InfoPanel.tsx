import { MessageSquare, MessagesSquare, Star, LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface InfoPanelProps {
  question: string;
  opinionCount: number;
}

export function InfoPanel({ question, opinionCount }: InfoPanelProps) {
  const { user, signOut } = useAuth();
  
  const steps = [
    { icon: MessageSquare, text: 'STATE your opinion' },
    { icon: MessagesSquare, text: 'DEBATE other opinions' },
    { icon: Star, text: 'RATE your chat' },
  ];

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out');
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Logo */}
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl md:text-2xl font-medium text-white"
      >
        freemind
      </motion.h1>

      {/* Question */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium leading-tight text-white">
          {question}
        </h2>
        <p className="mt-2 text-white/60 text-sm md:text-base">
          {opinionCount} opinions
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 md:gap-4 mt-2 md:mt-4"
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
            <span className="text-sm">{step.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Auth Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 md:mt-4"
      >
        {user ? (
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 h-11 md:h-10 px-5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        ) : (
          <Link to="/auth">
            <Button className="bg-primary hover:bg-primary/90 h-11 md:h-10 px-5">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Participate
            </Button>
          </Link>
        )}
      </motion.div>
    </div>
  );
}
