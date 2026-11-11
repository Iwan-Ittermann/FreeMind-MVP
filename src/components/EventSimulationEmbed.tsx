import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SimDatasetSwitch } from '@/components/SimDatasetSwitch';
import { useSimDataset } from '@/hooks/useSimDataset';

export function EventSimulationEmbed({ wedium = false }: { wedium?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [preload, setPreload] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [chosenDataset, setDataset] = useSimDataset();
  // Wedium only ever shows the AI simulation, never the August discussion.
  const dataset = wedium ? 'social' : chosenDataset;
  const sendInteraction = () => frameRef.current?.contentWindow?.postMessage({ type: 'freemind:embed-interaction', active: interactive }, window.location.origin);
  useEffect(() => {
    const main = sectionRef.current?.closest('main');
    if (!main) return;
    const start = () => { if (main.scrollTop > 12) setPreload(true); };
    main.addEventListener('scroll', start, { passive: true });
    start();
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) setPreload(true); }, { root: main, rootMargin: '200px' });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => { main.removeEventListener('scroll', start); observer.disconnect(); };
  }, []);
  useEffect(() => { sendInteraction(); }, [interactive]);
  return (
    <div ref={sectionRef} className="simulation-editorial w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] items-center gap-8 lg:gap-16">
      <div className="flex min-w-0 flex-col items-start gap-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-alert">{t(wedium ? 'replay.wediumTransition' : 'replay.transition')}</p>
        <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.9]">{t('replay.tryTitle')}</h2>
        <p className="max-w-md text-xl sm:text-2xl leading-snug">{t('replay.tryBody')}</p>
        {!wedium && <p className="max-w-md text-base sm:text-lg leading-snug text-muted-foreground">{t('replay.tryInvitation')}</p>}
        {!wedium && (
          <>
            <Button onClick={() => { setPreload(true); setInteractive((value) => !value); }} aria-expanded={interactive} aria-controls="simulation-frame" className="h-auto max-w-full rounded-none whitespace-normal bg-foreground text-background px-6 py-4 text-sm font-bold uppercase hover:bg-alert">
              {t(interactive ? 'replay.watch' : 'replay.join')} {interactive ? <ChevronUp /> : <ArrowRight />}
            </Button>
            <p className="text-xs text-muted-foreground">{t('replay.sessionNote')}</p>
          </>
        )}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-4">
      {!wedium && <SimDatasetSwitch value={dataset} onChange={setDataset} />}
      <div id="simulation-frame" className={cn('simulation-stage relative w-full overflow-hidden', interactive && 'simulation-stage-active')}>
      {preload ? <iframe
        ref={frameRef}
        key={`${lang}-${dataset}`}
        title={t('replay.embedTitle')}
        src={`/go?embed=1&lang=${lang}&dataset=${dataset}${wedium ? '&presentation=wedium' : ''}`}
        loading="eager"
        onLoad={sendInteraction}
        tabIndex={interactive ? 0 : -1}
        className={cn('absolute inset-0 h-full w-full border-0', !interactive && 'pointer-events-none')}
      /> : <div className="simulation-placeholder absolute inset-0 flex items-center justify-center" aria-hidden><div className="aspect-square w-4/5 rounded-full border border-foreground/20" /></div>}
      </div>
      {!wedium && !interactive && <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />}
      {!wedium && (
        <Button asChild variant="link" className="h-auto text-xs text-foreground underline underline-offset-4">
          <a href={`/sim?dataset=${dataset}`} target="_blank" rel="noopener noreferrer">{t('replay.openDiscussion')}<ArrowUpRight /></a>
        </Button>
      )}
      </div>
    </div>
  );
}