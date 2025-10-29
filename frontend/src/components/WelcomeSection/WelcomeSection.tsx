import { Link } from 'react-router-dom';
import Logo from '../Logo/Logo';
import css from './WelcomeSection.module.css';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export default function WelcomeSection() {
  const { t, i18n } = useTranslation();

  return (
    <div className={css.container}>
      <div className={css.logo}>
        <Logo />
      </div>
      <div className={css.titles}>
        <h2
          className={clsx(css.subtitle, {
            [css.subtitleUk]: i18n.language === 'uk',
          })}
        >
          {t('daily_online_planner')}
        </h2>
        <h1 className={clsx(css.title, { [css.titleUk]: i18n.language === 'uk' })}>
          {t('calendar_app')}
        </h1>
      </div>
      <div className={css.buttons}>
        <Link
          to="/signup"
          className={clsx(css.tryTracker, {
            [css.tryTrackerUk]: i18n.language === 'uk',
          })}
        >
          {t('register_user')}
        </Link>
        <Link
          to="/signin"
          className={clsx(css.signIn, {
            [css.signInUk]: i18n.language === 'uk',
          })}
        >
          {t('login_user')}
        </Link>
      </div>
    </div>
  );
}
