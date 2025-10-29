import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

//import files with translations
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
  lng: 'en',
  fallbackLng: 'en',
  ns: ['auth', 'form', 'validation', 'common', 'calendar'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  debug: process.env.NODE_ENV === 'development',
  react: {
    useSuspense: false,
  },
});

export default i18n;
