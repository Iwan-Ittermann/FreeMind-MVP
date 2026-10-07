import { useCallback, useEffect, useState } from 'react';

const KEY = 'freemind_stream_spiral_v2';
const CHANGE_EVENT = 'freemind:stream-spiral-change';

function readPreference() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

/** Zahnrad-Umschalter: Spirale im Graphen ein-/ausblenden (Standard: aus). */
export function useStreamSpiralPref() {
  const [show, setShow] = useState<boolean>(readPreference);

  useEffect(() => {
    const sync = () => setShow(readPreference());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !readPreference();
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    setShow(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { showStreamSpiral: show, toggleStreamSpiral: toggle };
}
