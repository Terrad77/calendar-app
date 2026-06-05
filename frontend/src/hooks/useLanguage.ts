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

type LanguageCode = 'en' | 'uk';

interface LanguageOption {
  code: LanguageCode;
  name: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
];

export const useLanguage = () => {
  const { i18n, t } = useTranslation('common');

  useEffect(() => {
    const lang = i18n.language.startsWith('uk') ? 'uk' : 'en';
    dayjs.locale(lang);
  }, [i18n.language]);

  const changeLanguage = async (lng: LanguageCode): Promise<void> => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('language', lng);
      toast.success(lng === 'en' ? t('language_changed_en') : t('language_changed_uk'));
    } catch {
      toast.error(t('error_changing_language'));
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('language') as LanguageCode;
    if (saved && LANGUAGES.some((l) => l.code === saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  return {
    changeLanguage,
    currentLanguage: i18n.language as LanguageCode,
    languages: LANGUAGES,
  };
};
