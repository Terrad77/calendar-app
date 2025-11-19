import { useTheme } from '../../hooks/useTheme';
import css from './ThemeSwitcher.module.css';
import Icon from '../Icon';

export const ThemeSwitcher = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className={css.themeButtonContainer}>
      <button
        className={css.themeButton}
        onClick={toggleTheme}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        {isDark ? (
          <Icon className={css.icon} name="sun" aria-label="Switch to light theme" />
        ) : (
          <Icon className={css.icon} name="moon" aria-label="Switch to dark theme" />
        )}
        <span className={css.textButton}>{isDark ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  );
};
