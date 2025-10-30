import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enAuth from './en/auth.json';
import enForm from './en/form.json';
import enValidation from './en/validation.json';
import enCommon from './en/common.json';
import enCalendar from './en/calendar.json';

import ukAuth from './uk/auth.json';
import ukForm from './uk/form.json';
import ukValidation from './uk/validation.json';
import ukCommon from './uk/common.json';
import ukCalendar from './uk/calendar.json';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      auth: enAuth,
      form: enForm,
      validation: enValidation,
      common: enCommon,
      calendar: enCalendar,
    },
    uk: {
      auth: ukAuth,
      form: ukForm,
      validation: ukValidation,
      common: ukCommon,
      calendar: ukCalendar,
    },
  },
  lng: 'en', // default language
  fallbackLng: 'en',
  ns: ['auth', 'form', 'validation', 'common', 'calendar'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already safes from XSS
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  react: {
    useSuspense: false, // Disable Suspense for compatibility
  },
});

export default i18n;
