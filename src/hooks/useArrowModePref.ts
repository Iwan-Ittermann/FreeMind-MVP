import { useEffect, useState } from 'react';

const KEY = 'tt-arrow-mode';
const EVENT = 'tt:arrow-mode-changed';

export function getArrowMode(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setArrowMode(enabled: boolean) {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { enabled } }));
}

/** Per-device preference: render chats as short directional arrows. */
export function useArrowModePref() {
  const [enabled, setEnabled] = useState<boolean>(getArrowMode);

  useEffect(() => {
    const sync = () => setEnabled(getArrowMode());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { arrowMode: enabled, setArrowMode };
}
