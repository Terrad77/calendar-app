import { Link } from 'react-router-dom';
import Logo from '../../components/Logo/Logo';
import SignInForm from '../../components/SignInForm/SignInForm';
import css from '../SignInPage/SignInPage.module.css';
import { useTranslation } from 'react-i18next';

import clsx from 'clsx';

export default function SignIpPage() {
  const { t } = useTranslation(['auth', 'form']);
  return (
    <div className={css.sectionContainer}>
      <div className={css.logo}>
        <Logo />
      </div>
      <div className={css.content}>
        <h2 className={clsx(css.title)}>{t('signing_in', { ns: 'form' })}</h2>
        <SignInForm />
        <p className={css.notify}>
          {t('do_not', { ns: 'auth' })}{' '}
          <Link className={clsx(css.navLink)} to="/signup">
            {t('register_user', { ns: 'auth' })}
          </Link>
        </p>
      </div>
    </div>
  );
}
