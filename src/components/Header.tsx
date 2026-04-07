import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title?: string;
  enlarged?: boolean;
  user?: { id: string } | null;
  onSignIn?: () => void;
}

export function Header({ title, enlarged, user, onSignIn }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white dark:bg-background flex-shrink-0">
      <div className={`px-3 lg:px-4 ${enlarged ? 'h-16' : 'h-14'} flex items-center gap-3`}>
        <Link to="/" className="flex items-center flex-shrink-0 z-10">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${enlarged ? 'text-base' : 'text-xs lg:text-sm'} font-semibold text-foreground`}
          >
            freemind
          </motion.span>
        </Link>

        {title && !enlarged && (
          <h1 className={`absolute left-1/2 -translate-x-1/2 max-w-[65%] text-sm lg:text-lg font-semibold text-foreground truncate text-center`}>
            {title}
          </h1>
        )}

        {/* Login button in header for unauthenticated users */}
        {!user && onSignIn && (
          <div className="ml-auto z-10">
            <Button
              onClick={onSignIn}
              variant="outline"
              size="sm"
              className="h-8 text-xs border-accent text-accent hover:bg-accent/10"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              {t('common.logIn')}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
