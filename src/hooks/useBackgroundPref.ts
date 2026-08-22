import { useEffect, useState } from 'react';

export type TTBackgroundStyle = 'eye' | 'cosmos';

const KEY = 'tt-bg-style';
const EVENT = 'tt:bg-style-changed';

export function getBackgroundStyle(): TTBackgroundStyle {
  try {
    return localStorage.getItem(KEY) === 'cosmos' ? 'cosmos' : 'eye';
  } catch {
    return 'eye';
  }
}

export function setBackgroundStyle(style: TTBackgroundStyle) {
  try {
    localStorage.setItem(KEY, style);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { style } }));
}

/** Per-device preference: graph background artwork (eye vs cosmos). */
export function useBackgroundPref() {
  const [style, setStyle] = useState<TTBackgroundStyle>(getBackgroundStyle);

  useEffect(() => {
    const sync = () => setStyle(getBackgroundStyle());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { bgStyle: style, setBgStyle: setBackgroundStyle };
}
