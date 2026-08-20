import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Discussion from './Discussion';
import { SecretGate, hasSecretAccess } from '@/components/tt/SecretGate';

/**
 * Password protected experiment: same discussion as /go, but all chats are
 * rendered as short directional arrows (length = chat length, color = points).
 * `?topic=test` previews the arrows on the playground question (which already
 * has chat data before the real discussion starts).
 */
export default function Secret() {
  const [unlocked, setUnlocked] = useState(() => hasSecretAccess());
  const [params] = useSearchParams();
  const mode = params.get('topic') === 'test' ? 'test' : 'real';

  if (!unlocked) return <SecretGate onUnlock={() => setUnlocked(true)} />;
  return <Discussion mode={mode} variant="arrows" />;
}

