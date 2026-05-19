import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import css from './ThemeSwitcher.module.css';
import Icon from '../Icon';

export const ThemeSwitcher = () => {
  const { toggleTheme, isDark } = useTheme();
  const { t } = useTranslation('common');

  return (
    <div className={css.themeButtonContainer}>
      <button
        className={css.themeButton}
        onClick={toggleTheme}
        title={isDark ? t('switch_to_light_theme') : t('switch_to_dark_theme')}
        type="button"
      >
        {isDark ? (
          <Icon className={css.icon} name="sun" aria-label={t('switch_to_light_theme')} />
        ) : (
          <Icon className={css.icon} name="moon" aria-label={t('switch_to_dark_theme')} />
        )}
        <span className={css.textButton}>{isDark ? t('light_theme') : t('dark_theme')}</span>
      </button>
    </div>
  );
};
