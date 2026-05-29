import { useLanguage } from '../../hooks/useLanguage';
import css from './LanguageSwitcher.module.css';
import btnCss from '../Header/HeaderButton.module.css';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '../../redux/user/selectors';
import { useAppDispatch } from '../../redux/hooks';
import { saveLanguageAndCountry } from '../../redux/user/operations';

export const LanguageSwitcher = () => {
  const { changeLanguage, currentLanguage, languages } = useLanguage();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const dispatch = useAppDispatch();

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);

    // If user is logged in, save to profile
    if (isLoggedIn) {
      dispatch(saveLanguageAndCountry({ language: languageCode }));
    }
  };

  return (
    <div className={css.languageButtonContainer}>
      {languages.map((language) => (
        <button
          key={language.code}
          className={`${btnCss.headerControl} ${css.languageButton} ${currentLanguage === language.code ? css.active : ''}`}
          onClick={() => handleLanguageChange(language.code)}
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
