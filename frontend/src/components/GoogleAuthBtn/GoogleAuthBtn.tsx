import googleLogo from '../../assets/icons/google-logo.svg';
import css from './GoogleAuthBtn.module.css';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import clsx from 'clsx';

export default function GoogleAuthBtn() {
  const { t, i18n } = useTranslation();

  return (
    <div className={css.wrapper}>
      <p
        className={clsx(css.separator, {
          [css.separatorUk]: i18n.language === 'uk',
        })}
      >
        {t('or_google', 'Or continue with Google')}
      </p>
      <motion.a
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
        href="https://calendar-app-i6oa.onrender.com/api/users/google" // backend URL
        className={clsx(css.googleBtn, {
          [css.googleBtnUk]: i18n.language === 'uk',
        })}
      >
        <img src={googleLogo} alt="Google" className={css.googleIcon} />
        <p>{t('sign_in_with_google', 'Sign in with Google')}</p>
      </motion.a>
    </div>
  );
}
