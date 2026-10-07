import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EventSimulationEmbed({ wedium = false }: { wedium?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <iframe
        key={lang}
        title={t('replay.embedTitle')}
        src={`/go?embed=1&lang=${lang}${wedium ? '&presentation=wedium' : ''}`}
        loading="lazy"
        className="h-[min(760px,85svh)] min-h-[560px] w-full max-w-[480px] border border-foreground/20 bg-background"
      />
      <Button asChild variant="link" className="text-foreground underline underline-offset-4">
        <a href="/go">{t('replay.openDiscussion')}<ArrowUpRight /></a>
      </Button>
    </div>
  );
}