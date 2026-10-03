import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Keeps the permanent /sim replay caught up while someone is watching.
 * The server places every event at its fixed loop time, so all visitors see
 * the same discussion no matter who triggered the catch-up. Renders nothing.
 */
export function TTSimControl() {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        supabase.functions.invoke('sim-replay', { body: {} }).catch(() => {});
      }
    };
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
