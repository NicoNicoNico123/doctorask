import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


// Import translation files
import enCommon from './locales/en/common.json';
import zhTWCommon from './locales/zh-TW/common.json';
import enPrompts from './locales/en/prompts.json';
import zhTWPrompts from './locales/zh-TW/prompts.json';

// Language detection options
const detectionOptions = {
  // Order matters - first match will be used
  order: ['localStorage', 'navigator', 'htmlTag'],

  // Local storage keys and caches
  caches: ['localStorage'],

  // Local storage key to store language preference
  lookupLocalStorage: 'mbti_language',

  // Languages to detect
  checkWhitelist: true,

  // Language mapping to handle Chinese variants
  lookupFromSubdomain: false,
  lookupFromPathIndex: 0,
};

i18n
  // Use language detector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Detection options
    detection: detectionOptions,

    // Default language
    lng: 'en',

    // Whitelist of available languages
    supportedLngs: ['en', 'zh-TW'],

    // Fallback language
    fallbackLng: 'en',

    // Default namespace
    defaultNS: 'common',
    ns: ['common', 'prompts'],

    // Debug mode
    debug: false,

    // Resources
    resources: {
      en: {
        common: enCommon,
        prompts: enPrompts,
      },
      'zh-TW': {
        common: zhTWCommon,
        prompts: zhTWPrompts,
      }
    },

    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // React options
    react: {
      useSuspense: false, // Disable suspense mode for now
    },

    });

export default i18n;