import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export const useLanguage = () => {
  const { i18n } = useTranslation();

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
