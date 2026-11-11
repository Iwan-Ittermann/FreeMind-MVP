import { useEventConfig, useEventPhase } from '@/hooks/useEventConfig';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Discussion from './Discussion';

/** Switch entire discussion instances, never their topic IDs in place. */
export default function EventGo({ standaloneWedium = false }: { standaloneWedium?: boolean }) {
  const [params] = useSearchParams();
  const embedded = params.get('embed') === '1';
  const wediumPresentation = standaloneWedium || (embedded && params.get('presentation') === 'wedium');
  // Dataset choice only applies to the embedded freemind player; /go and every Wedium view show the AI simulation.
  const dataset = embedded && !wediumPresentation && params.get('dataset') === 'august' ? 'august' : 'social';
  const { i18n } = useTranslation();
  const lang = params.get('lang');
  const [embedInteractive, setEmbedInteractive] = useState(false);
  // /go defaults to the eye artwork, but the gear-menu toggle must keep working.
  useState(() => {
    if (embedded || standaloneWedium) return;
    try { if (!localStorage.getItem('tt-bg-style')) localStorage.setItem('tt-bg-style', 'eye'); } catch { /* ignore */ }
  });
  useEffect(() => {
    if (!embedded) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === 'freemind:embed-interaction' && typeof event.data.active === 'boolean') setEmbedInteractive(event.data.active);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [embedded]);
  useEffect(() => {
    if (embedded && (lang === 'de' || lang === 'en')) void i18n.changeLanguage(lang);
  }, [embedded, lang, i18n]);
  const { data: config, isLoading } = useEventConfig();
  const { phase } = useEventPhase(config);
  if (isLoading || !config) return <div className="fixed inset-0 bg-background" aria-busy="true" />;
  const preview = embedded || !config.realShortCode || phase !== 'discussion';
  return <Discussion key={preview ? `event-preview-${dataset}` : 'event-live'} simDataset={dataset} mode={preview ? 'sim' : 'real'} eventPreview={preview} embedded={embedded} embedInteractive={embedInteractive} wediumPresentation={wediumPresentation} />;
}