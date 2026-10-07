import { useEventConfig, useEventPhase } from '@/hooks/useEventConfig';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Discussion from './Discussion';

/** Switch entire discussion instances, never their topic IDs in place. */
export default function EventGo() {
  const [params] = useSearchParams();
  const embedded = params.get('embed') === '1';
  const wediumPresentation = params.get('presentation') === 'wedium';
  const { i18n } = useTranslation();
  const lang = params.get('lang');
  const [embedInteractive, setEmbedInteractive] = useState(false);
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
  const preview = embedded || !config.realShortCode || phase === 'prelaunch';
  return <Discussion key={preview ? 'event-preview' : 'event-live'} mode={preview ? 'sim' : 'real'} eventPreview={preview} embedded={embedded} embedInteractive={embedInteractive} wediumPresentation={wediumPresentation} />;
}