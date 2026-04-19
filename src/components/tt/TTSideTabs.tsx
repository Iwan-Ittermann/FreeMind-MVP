import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X } from 'lucide-react';

interface TTSideTabsProps {
  opinionsContent?: React.ReactNode;
  chatsContent?: React.ReactNode;
}

export function TTSideTabs({ opinionsContent, chatsContent }: TTSideTabsProps) {
  const { t } = useTranslation();
  const [side, setSide] = useState<'left' | 'right' | null>(null);

  return (
    <>
      {/* Left tab — top third */}
      <button
        onClick={() => setSide('left')}
        className="absolute left-0 top-[22%] z-20 h-28 w-7 rounded-r-xl bg-background/85 backdrop-blur-md border border-l-0 border-border/40 shadow-md flex items-center justify-center"
        aria-label={t('tt.opinions')}
      >
        <span
          className="text-[10px] tracking-[0.2em] font-semibold text-foreground/80 uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t('tt.opinions')}
        </span>
      </button>

      {/* Right tab — bottom third */}
      <button
        onClick={() => setSide('right')}
        className="absolute right-0 bottom-[28%] z-20 h-28 w-7 rounded-l-xl bg-background/85 backdrop-blur-md border border-r-0 border-border/40 shadow-md flex items-center justify-center"
        aria-label={t('tt.chats')}
      >
        <span
          className="text-[10px] tracking-[0.2em] font-semibold text-foreground/80 uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          {t('tt.chats')}
        </span>
      </button>

      <Sheet open={side === 'left'} onOpenChange={(o) => !o && setSide(null)}>
        <SheetContent side="left" hideClose className="w-[85%] sm:w-[400px] p-0">
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <h2 className="font-semibold">{t('tt.opinions')}</h2>
            <button onClick={() => setSide(null)} className="p-1 rounded-full hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-auto">
            {opinionsContent ?? (
              <p className="text-sm text-muted-foreground">{t('tt.opinionsEmpty')}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={side === 'right'} onOpenChange={(o) => !o && setSide(null)}>
        <SheetContent side="right" hideClose className="w-[85%] sm:w-[400px] p-0">
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <h2 className="font-semibold">{t('tt.chats')}</h2>
            <button onClick={() => setSide(null)} className="p-1 rounded-full hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-auto">
            {chatsContent ?? (
              <p className="text-sm text-muted-foreground">{t('tt.chatsEmpty')}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
