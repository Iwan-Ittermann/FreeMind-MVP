import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import de from './locales/de.json';

const isDev = import.meta.env.DEV;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  // English-first globally; wedium starts in German unless a language was chosen before.
  lng: (() => {
    try {
      const storedLanguage = localStorage.getItem('freemind_lang');
      if (storedLanguage) return storedLanguage;
      return window.location.pathname.startsWith('/wedium') ? 'de' : 'en';
    } catch {
      return window.location.pathname.startsWith('/wedium') ? 'de' : 'en';
    }
  })(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'de'],
  interpolation: {
    escapeValue: false,
  },
  saveMissing: isDev,
  missingKeyHandler: isDev
    ? (lngs, ns, key) => {
        console.warn(`[i18n] Missing translation key: "${key}" (lng: ${lngs.join(',')}, ns: ${ns})`);
      }
    : undefined,
});

export default i18n;
