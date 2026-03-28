import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  title?: string;
  enlarged?: boolean;
  user?: User | null;
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

        {/* One-click login button when not authenticated */}
        {user === null && onSignIn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignIn}
            className="ml-auto z-10 text-muted-foreground hover:text-foreground"
          >
            <LogIn className="w-4 h-4 mr-1.5" />
            <span className="text-xs">{t('common.logIn', 'Log In')}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
