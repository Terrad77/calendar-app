import googleLogo from '../../assets/icons/google-logo.svg';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './GoogleAuthBtn.module.css';

export default function GoogleAuthBtn() {
  const { t } = useTranslation(['auth']);
  const apiUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

  return (
    <div className={styles.wrapper}>
      <p className={styles.separator}>{t('or_google')}</p>
      <motion.a
        href={`${apiUrl}/api/auth/google`}
        className={styles.googleBtn}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.01 }}
      >
        <span className={styles.googleIconWrap}>
          <img src={googleLogo} alt="Google" className={styles.googleIcon} />
        </span>
        <span className={styles.googleText}>{t('sign_in_with_google')}</span>
      </motion.a>
    </div>
  );
}
