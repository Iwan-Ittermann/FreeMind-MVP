import { useEventConfig, useEventPhase } from '@/hooks/useEventConfig';
import Discussion from './Discussion';

/** Switch entire discussion instances, never their topic IDs in place. */
export default function EventGo() {
  const { data: config, isLoading } = useEventConfig();
  const { phase } = useEventPhase(config);
  if (isLoading || !config) return <div className="fixed inset-0 bg-background" aria-busy="true" />;
  const preview = !config.realShortCode || phase === 'prelaunch';
  return <Discussion key={preview ? 'event-preview' : 'event-live'} mode={preview ? 'sim' : 'real'} eventPreview={preview} />;
}