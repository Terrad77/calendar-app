import { useLanguage } from '../../hooks/useLanguage';
import css from './LanguageSwitcher.module.css';

export const LanguageSwitcher = () => {
  const { changeLanguage, currentLanguage, languages } = useLanguage();

  console.log('Current language:', currentLanguage); // Debug log

  return (
    <div className={css.languageSwitcher}>
      {languages.map((language) => (
        <button
          key={language.code}
          className={`${css.languageButton} ${currentLanguage === language.code ? css.active : ''}`}
          onClick={() => changeLanguage(language.code)}
          title={language.name}
          type="button" // Ensure it's a button
        >
          <span className={css.flag}>{language.flag}</span>
          <span className={css.code}>{language.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};
