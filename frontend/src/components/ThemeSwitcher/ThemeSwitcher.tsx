import { useTheme } from '../../hooks/useTheme';
import css from './ThemeSwitcher.module.css';
import Icon from '../Icon';

export const ThemeSwitcher = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      className={css.themeButton}
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <Icon name="sun" aria-label="Switch to light theme" />
      ) : (
        <Icon name="moon" aria-label="Switch to dark theme" />
      )}
      <span className={css.textButton}>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
};
