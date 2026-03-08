import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
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
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg md:text-xl font-semibold text-foreground"
            >
              freemind
            </motion.span>
          </Link>

          {title && !isMobile && (
            <div className="absolute left-1/2 transform -translate-x-1/2 max-w-[50%]">
              <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
            </div>
          )}

          {/* Desktop only: burger for About/Tutorial/Settings */}
          {!isMobile && (
            <Button
              onClick={() => setMenuOpen(true)}
              size="icon"
              variant="outline"
              className="h-10 w-10 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted relative"
            >
              <Menu className="h-5 w-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Button>
          )}
        </div>
      </header>

      <MainMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        topicId={topicId}
      />
    </>
  );
}
