import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';
import 'dayjs/locale/en';

export const useLanguage = () => {
  const { i18n } = useTranslation();

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
        toast.success(`Language changed to ${lng === 'en' ? 'English' : 'Українська'}`);
      })
      .catch((error) => {
        toast.error('Error changing language', error);
      });
  };
  //
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
