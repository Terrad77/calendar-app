import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/uk';
import 'dayjs/locale/en';

dayjs.extend(updateLocale);
dayjs.updateLocale('en', { weekStart: 1 });
dayjs.updateLocale('uk', { weekStart: 1 });

export const useLanguage = () => {
  const { i18n, t } = useTranslation('common');

  // synchronization dayjs and language i18next
  useEffect(() => {
    const lang = i18n.language.startsWith('uk') ? 'uk' : 'en';
    dayjs.locale(lang);
  }, [i18n.language]);

  // function to change language
  const changeLanguage = (lng: string) => {
    i18n
      .changeLanguage(lng)
      .then(() => {
        // Save language to localStorage
        localStorage.setItem('language', lng);
        toast.success(lng === 'en' ? t('language_changed_en') : t('language_changed_uk'));
      })
      .catch(() => {
        toast.error(t('error_changing_language'));
      });
  };

  // Load saved language on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const currentLanguage = i18n.language;

  return {
    changeLanguage,
    currentLanguage,
    languages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    ],
  };
};
