import { useState } from 'react';
import Discussion from './Discussion';
import { SecretGate, hasSecretAccess } from '@/components/tt/SecretGate';

/**
 * Password protected experiment: same discussion as /go, but all chats are
 * rendered as short directional arrows (length = chat length, color = points).
 */
export default function Secret() {
  const [unlocked, setUnlocked] = useState(() => hasSecretAccess());

  if (!unlocked) return <SecretGate onUnlock={() => setUnlocked(true)} />;
  return <Discussion mode="real" variant="arrows" />;
}
