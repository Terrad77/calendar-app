import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        or_google: 'Or continue with Google',
        sign_in_with_google: 'Sign in with Google',
        welcome: 'Welcome',
        loading: 'Loading...',
      },
    },
    uk: {
      translation: {
        or_google: 'Або через Google',
        sign_in_with_google: 'Увійти через Google',
        welcome: 'Ласкаво просимо',
        loading: 'Завантаження...',
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
