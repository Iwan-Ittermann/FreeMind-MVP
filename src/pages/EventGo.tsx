import { useEventConfig, useEventPhase } from '@/hooks/useEventConfig';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Discussion from './Discussion';

/** Switch entire discussion instances, never their topic IDs in place. */
export default function EventGo() {
  const [params] = useSearchParams();
  const embedded = params.get('embed') === '1';
  const wediumPresentation = params.get('presentation') === 'wedium';
  const { i18n } = useTranslation();
  const lang = params.get('lang');
  useEffect(() => {
    if (embedded && (lang === 'de' || lang === 'en')) void i18n.changeLanguage(lang);
  }, [embedded, lang, i18n]);
  const { data: config, isLoading } = useEventConfig();
  const { phase } = useEventPhase(config);
  if (isLoading || !config) return <div className="fixed inset-0 bg-background" aria-busy="true" />;
  const preview = embedded || !config.realShortCode || phase === 'prelaunch';
  return <Discussion key={preview ? 'event-preview' : 'event-live'} mode={preview ? 'sim' : 'real'} eventPreview={preview} embedded={embedded} wediumPresentation={wediumPresentation} />;
}