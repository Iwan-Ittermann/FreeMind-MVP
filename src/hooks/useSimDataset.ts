import { useCallback, useEffect, useState } from 'react';

export type SimDataset = 'social' | 'august';
const KEY = 'freemind_sim_dataset';
const EVENT = 'freemind:sim-dataset';

function read(): SimDataset {
  try { return localStorage.getItem(KEY) === 'august' ? 'august' : 'social'; } catch { return 'social'; }
}

/** Which replay dataset the player shows; remembered per device and synced in-page. */
export function useSimDataset(initial?: SimDataset | null) {
  const [dataset, setState] = useState<SimDataset>(() => initial ?? read());
  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const setDataset = useCallback((next: SimDataset) => {
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    setState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [dataset, setDataset] as const;
}
