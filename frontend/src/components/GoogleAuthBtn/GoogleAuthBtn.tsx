import googleLogo from '../../assets/icons/google-logo.svg';
import css from './GoogleAuthBtn.module.css';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export default function GoogleAuthBtn() {
  const { t, i18n } = useTranslation(['auth']); // Specify namespace
  const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001';

  return (
    <div className={css.wrapper}>
      <p
        className={clsx(css.separator, {
          [css.separatorUk]: i18n.language === 'uk',
        })}
      >
        {t('or_google')}
      </p>
      <motion.a
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
        href={`${apiUrl}/api/auth/google`}
        className={clsx(css.googleBtn, {
          [css.googleBtnUk]: i18n.language === 'uk',
        })}
      >
        <img src={googleLogo} alt="Google" className={css.googleIcon} />
        <p>{t('sign_in_with_google')}</p>
      </motion.a>
    </div>
  );
}
