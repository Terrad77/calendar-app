import { useTheme } from '../../hooks/useTheme';
import css from './ThemeSwitcher.module.css';
import Icon from '../Icon';

export const ThemeSwitcher = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      className={css.themeSwitcher}
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <Icon className={css.icon} name="sun" />
      ) : (
        <Icon className={css.icon} name="moon" />
      )}
      <span className={css.text}>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
};
