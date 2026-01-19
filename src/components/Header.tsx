import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Pencil, Settings, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SubmitOpinionDialog } from './SubmitOpinionDialog';
import { ConfigPanel } from './ConfigPanel';

interface HeaderProps {
  title?: string;
  topicId?: string;
  hasExistingOpinion?: boolean;
  onOpinionSubmitted?: () => void;
}

export function Header({ title, topicId, hasExistingOpinion, onOpinionSubmitted }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [opinionDialogOpen, setOpinionDialogOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out');
    }
  };

  const handleOpinionSuccess = () => {
    setOpinionDialogOpen(false);
    onOpinionSubmitted?.();
  };

  const showOpinionButton = user && topicId;
  const canAddOpinion = !hasExistingOpinion;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/" className="flex items-center">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-medium text-white"
            >
              freemind
            </motion.span>
          </Link>

          {/* Center: Title (desktop only) */}
          {title && (
            <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-sm font-medium text-white/80 max-w-md truncate">
                {title}
              </h1>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Add Opinion Button - highlighted if no opinion yet, greyed out if opinion exists */}
            {showOpinionButton && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <Button
                  onClick={() => canAddOpinion && setOpinionDialogOpen(true)}
                  size="icon"
                  variant="ghost"
                  disabled={!canAddOpinion}
                  className={canAddOpinion 
                    ? "relative h-9 w-9 bg-accent/20 text-accent hover:bg-accent/30 hover:text-accent ring-2 ring-accent/50 animate-pulse"
                    : "relative h-9 w-9 text-white/30 cursor-not-allowed"
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Config Button */}
            <Button
              onClick={() => setConfigOpen(true)}
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Auth Button */}
            {user ? (
              <Button
                onClick={handleSignOut}
                size="sm"
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/10 h-9 px-3"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            ) : (
              <Link to="/auth">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9 px-3"
                >
                  <LogIn className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Opinion Dialog */}
      {topicId && (
        <SubmitOpinionDialog
          open={opinionDialogOpen}
          onOpenChange={setOpinionDialogOpen}
          topicId={topicId}
          onSuccess={handleOpinionSuccess}
          hasExistingOpinion={hasExistingOpinion}
        />
      )}

      {/* Config Panel */}
      <ConfigPanel open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
}
