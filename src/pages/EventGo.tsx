import { useEventConfig, useEventPhase } from '@/hooks/useEventConfig';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Discussion from './Discussion';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { loginWithPassphrase } from '@/lib/passphrase-login';

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
  // One-click login from mail links (?p=passphrase); the parameter is removed right away.
  const queryClient = useQueryClient();
  const magicPhrase = embedded ? null : params.get('p');
  const [magicBusy, setMagicBusy] = useState(!!magicPhrase);
  useEffect(() => {
    if (!magicPhrase) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('p');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    void loginWithPassphrase(magicPhrase).then((res) => {
      if (res.ok) {
        void queryClient.invalidateQueries();
        toast.success(i18n.language === 'en' ? 'You are signed in.' : 'Du bist eingeloggt.');
      } else {
        toast.error(i18n.language === 'en' ? 'Login link invalid. Enter your passphrase via the gear menu.' : 'Login-Link ungültig. Gib deine Passphrase über das Zahnrad ein.');
      }
      setMagicBusy(false);
    });
  }, [magicPhrase, queryClient, i18n]);
  const { data: config, isLoading } = useEventConfig();
  const { phase } = useEventPhase(config);
  if (isLoading || !config || magicBusy) return <div className="fixed inset-0 bg-background" aria-busy="true" />;
  const preview = embedded || !config.realShortCode || phase !== 'discussion';
  return <Discussion key={preview ? `event-preview-${dataset}` : 'event-live'} simDataset={dataset} mode={preview ? 'sim' : 'real'} eventPreview={preview} embedded={embedded} embedInteractive={embedInteractive} wediumPresentation={wediumPresentation} />;
}