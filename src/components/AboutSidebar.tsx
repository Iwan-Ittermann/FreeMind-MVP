import { useTranslation } from 'react-i18next';
import { MessageSquare, MessagesSquare, Star } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const stepIcons = [MessageSquare, MessagesSquare, Star];
const stepKeys = ['state', 'chat', 'rate'] as const;

interface AboutSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutSidebar({ open, onOpenChange }: AboutSidebarProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" hideClose className="max-h-[75vh] rounded-t-2xl flex flex-col md:mx-auto md:max-w-[calc(100%-580px)] md:min-w-[400px] md:bottom-12">
        <SheetHeader>
          <SheetTitle>{t('about.title', 'About')}</SheetTitle>
          <SheetDescription className="sr-only">How FreeMind works</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto flex-1">
          {/* Tagline */}
          <p className="text-muted-foreground text-sm">{t('about.tagline')}</p>

          {/* 3-Step Process */}
          <div className="grid gap-4">
            {stepKeys.map((key, index) => {
              const Icon = stepIcons[index];
              return (
                <div key={key} className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground mb-0.5">
                      {t('about.step')} {index + 1}
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      {t(`about.steps.${key}.title`)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t(`about.steps.${key}.description`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bridging Score quick summary */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
            <p className="text-xs text-muted-foreground mb-1">{t('about.bridgingScore.formula', 'Formula')}</p>
            <p className="text-base font-mono font-bold text-primary">
              {t('about.bridgingScore.formulaText', 'Empathy × Disagreement')}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
