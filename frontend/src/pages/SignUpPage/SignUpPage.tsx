import { NavLink } from 'react-router-dom';
import { AuthPageShell } from '../../components/AuthPageShell/AuthPageShell';
import SignUpForm from '../../components/SignUpForm/SignUpForm';
import { useTranslation } from 'react-i18next';
import styles from './SignUpPage.module.css';

export default function SignUpPage() {
  const { t } = useTranslation(['auth', 'form']);
  return (
    <AuthPageShell
      eyebrow={t('signup_eyebrow', { ns: 'auth' })}
      title={t('register_user', { ns: 'form' })}
      description={t('signup_description', { ns: 'auth' })}
      ctaLabel={t('already_have', { ns: 'auth' })}
      ctaHref="/signin"
      ctaNote={t('login_user', { ns: 'auth' })}
      bullets={[
        t('signup_bullet_1', { ns: 'auth' }),
        t('signup_bullet_2', { ns: 'auth' }),
        t('signup_bullet_3', { ns: 'auth' }),
      ]}
    >
      <div className={styles.panelHeader}>
        <p className={styles.panelEyebrow}>{t('create_account', { ns: 'auth' })}</p>
        <h2 className={styles.title}>{t('register_user', { ns: 'form' })}</h2>
        <p className={styles.subtitle}>{t('signup_subtitle', { ns: 'auth' })}</p>
      </div>

      <SignUpForm />

      <p className={styles.notify}>
        {t('already_have', { ns: 'auth' })}{' '}
        <NavLink className={styles.navLink} to="/signin">
          {t('login_user', { ns: 'auth' })}
        </NavLink>
      </p>
    </AuthPageShell>
  );
}
