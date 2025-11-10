import { useLanguage } from '../../hooks/useLanguage';
import css from './LanguageSwitcher.module.css';

export const LanguageSwitcher = () => {
  const { changeLanguage, currentLanguage, languages } = useLanguage();

  return (
    <div className={css.languageSwitcher}>
      {languages.map((language) => (
        <button
          key={language.code}
          className={`${css.languageButton} ${currentLanguage === language.code ? css.active : ''}`}
          onClick={() => changeLanguage(language.code)}
          title={language.name}
          type="button"
        >
          <span className={css.flag}>{language.flag}</span>
          <span className={css.code}>{language.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};
