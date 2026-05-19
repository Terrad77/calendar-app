import { Link } from 'react-router-dom';
import { AuthPageShell } from '../../components/AuthPageShell/AuthPageShell';
import SignInForm from '../../components/SignInForm/SignInForm';
import { useTranslation } from 'react-i18next';
import styles from './SignInPage.module.css';

export default function SignInPage() {
  const { t } = useTranslation(['auth', 'form']);
  return (
    <AuthPageShell
      eyebrow={t('welcome_back', { ns: 'auth' })}
      title={t('signing_in', { ns: 'form' })}
      description={t('signin_description', { ns: 'auth' })}
      ctaLabel={t('do_not', { ns: 'auth' })}
      ctaHref="/signup"
      ctaNote={t('register_user', { ns: 'auth' })}
      bullets={[
        t('signin_bullet_1', { ns: 'auth' }),
        t('signin_bullet_2', { ns: 'auth' }),
        t('signin_bullet_3', { ns: 'auth' }),
      ]}
    >
      <div className={styles.panelHeader}>
        <p className={styles.panelEyebrow}>{t('secure_access', { ns: 'auth' })}</p>
        <h2 className={styles.title}>{t('signing_in', { ns: 'form' })}</h2>
        <p className={styles.subtitle}>{t('signin_subtitle', { ns: 'auth' })}</p>
      </div>

      <SignInForm />

      <p className={styles.notify}>
        {t('do_not', { ns: 'auth' })}{' '}
        <Link className={styles.navLink} to="/signup">
          {t('register_user', { ns: 'auth' })}
        </Link>
      </p>
    </AuthPageShell>
  );
}
