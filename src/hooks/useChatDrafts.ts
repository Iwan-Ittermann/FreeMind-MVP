import { useCallback, useEffect, useState } from 'react';

/**
 * Local (per-device) chat drafts. Keyed by the OTHER side's opinion id so a
 * draft survives even before the chat row exists.
 */
const PREFIX = 'tt:chat-draft:';
const EVENT = 'tt:chat-draft-changed';

export function readDraft(opinionId: string): string {
  try {
    return localStorage.getItem(PREFIX + opinionId) ?? '';
  } catch {
    return '';
  }
}

export function writeDraft(opinionId: string, value: string) {
  try {
    if (value.trim()) localStorage.setItem(PREFIX + opinionId, value);
    else localStorage.removeItem(PREFIX + opinionId);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { opinionId } }));
}

export function readAllDrafts(): Map<string, string> {
  const out = new Map<string, string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const value = localStorage.getItem(key);
      if (value?.trim()) out.set(key.slice(PREFIX.length), value);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Reactive view of all drafts (updates on write from anywhere in the app). */
export function useChatDrafts(): Map<string, string> {
  const [drafts, setDrafts] = useState<Map<string, string>>(() => readAllDrafts());

  useEffect(() => {
    const refresh = () => setDrafts(readAllDrafts());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return drafts;
}

/** Draft binding for a single chat. */
export function useChatDraft(opinionId: string | null | undefined) {
  const get = useCallback(() => (opinionId ? readDraft(opinionId) : ''), [opinionId]);
  const set = useCallback(
    (value: string) => {
      if (opinionId) writeDraft(opinionId, value);
    },
    [opinionId],
  );
  return { get, set };
}
