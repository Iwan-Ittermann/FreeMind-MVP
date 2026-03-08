import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white dark:bg-background flex-shrink-0">
      <div className="px-3 md:px-4 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center flex-shrink-0 z-10">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs md:text-sm font-semibold text-gray-900 dark:text-foreground"
          >
            freemind
          </motion.span>
        </Link>

        {title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 max-w-[65%] text-sm md:text-lg font-semibold text-gray-900 dark:text-foreground truncate text-center">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}
