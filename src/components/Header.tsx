import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { MainMenu } from './MainMenu';

interface HeaderProps {
  title?: string;
  topicId?: string;
  totalUnread?: number;
}

export function Header({ title, topicId, totalUnread = 0 }: HeaderProps) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white dark:bg-background flex-shrink-0">
      <div className="px-3 md:px-4 h-14 md:h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center flex-shrink-0">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm md:text-lg font-semibold text-gray-900 dark:text-foreground"
          >
            freemind
          </motion.span>
        </Link>

        {title && (
          <h1 className="flex-1 min-w-0 text-sm md:text-lg font-semibold text-gray-900 dark:text-foreground truncate text-left">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}
