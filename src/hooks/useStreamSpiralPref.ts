import { useCallback, useEffect, useState } from 'react';

const KEY = 'freemind_stream_spiral';

/** Zahnrad-Umschalter: Spirale im Graphen ein-/ausblenden (Standard: an). */
export function useStreamSpiralPref() {
  const [show, setShow] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, show ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, [show]);

  const toggle = useCallback(() => setShow((s) => !s), []);
  return { showStreamSpiral: show, toggleStreamSpiral: toggle };
}
