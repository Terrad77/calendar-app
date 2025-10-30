import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    console.log('Changing language to:', lng); // Debug log
    i18n
      .changeLanguage(lng)
      .then(() => {
        console.log('Language changed successfully to:', lng);
      })
      .catch((error) => {
        console.error('Error changing language:', error);
      });
  };

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
