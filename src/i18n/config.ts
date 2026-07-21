import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import de from './locales/de.json';
import { SINGLE_TOPIC_MODE } from '@/lib/single-topic';

const isDev = import.meta.env.DEV;

const chain = SINGLE_TOPIC_MODE ? i18n.use(initReactI18next) : i18n.use(LanguageDetector).use(initReactI18next);

chain.init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: SINGLE_TOPIC_MODE ? 'de' : undefined,
  fallbackLng: 'de',
  supportedLngs: ['en', 'de'],
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
  },
  saveMissing: isDev,
  missingKeyHandler: isDev
    ? (lngs, ns, key) => {
        console.warn(`[i18n] Missing translation key: "${key}" (lng: ${lngs.join(',')}, ns: ${ns})`);
      }
    : undefined,
});

if (SINGLE_TOPIC_MODE && i18n.language !== 'de') {
  i18n.changeLanguage('de');
}

export default i18n;
