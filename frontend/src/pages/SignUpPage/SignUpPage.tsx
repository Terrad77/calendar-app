import { NavLink } from 'react-router-dom';
import Logo from '../../components/Logo/Logo';
import SignUpForm from '../../components/SignUpForm/SignUpForm';
import css from '../SignUpPage/SignUpPage.module.css';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export default function SignUpPage() {
  // Specify namespaces for translations
  const { t, i18n } = useTranslation(['auth', 'form']);

  return (
    <div className={css.desctopContainer}>
      <div className={css.container}>
        <div className={css.logo}>
          <Logo />
        </div>
        <div className={css.content}>
          <h2
            className={clsx(css.title, {
              [css.titleUk]: i18n.language === 'uk',
            })}
          >
            {t('register_user_form', { ns: 'form' })}
          </h2>
          <SignUpForm />
          <p
            className={clsx(css.notify, {
              [css.notifyUk]: i18n.language === 'uk',
            })}
          >
            {t('already_have', { ns: 'auth' })}{' '}
            <NavLink
              className={clsx(css.navLink, {
                [css.navLinkUk]: i18n.language === 'uk',
              })}
              to="/signin"
            >
              {t('login_user', { ns: 'auth' })}
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}
