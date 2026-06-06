import { useLanguage } from '../../hooks/useLanguage';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from '../../redux/user/selectors';
import { useAppDispatch } from '../../redux/hooks';
import { saveLanguageAndCountry } from '../../redux/user/operations';
import css from './LanguageSwitcher.module.css';
import btnCss from '../Header/HeaderButton.module.css';

export const LanguageSwitcher = () => {
  const { changeLanguage, currentLanguage, languages } = useLanguage();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const dispatch = useAppDispatch();

  // Derive current and next entries from the fixed 2-item LANGUAGES array
  const current = languages.find((l) => l.code === currentLanguage) ?? languages[0];
  const next = languages.find((l) => l.code !== currentLanguage) ?? languages[1];

  const handleToggle = () => {
    changeLanguage(next.code);
    if (isLoggedIn) {
      dispatch(saveLanguageAndCountry({ language: next.code }));
    }
  };

  return (
    <button
      className={`${btnCss.headerControl} ${css.langToggle}`}
      onClick={handleToggle}
      title={`Switch to ${next.name}`}
      aria-label={`Switch to ${next.name}`}
      type="button"
    >
      <span className={css.flag}>{current.flag}</span>
      <span className={css.code}>{current.code.toUpperCase()}</span>
    </button>
  );
};
