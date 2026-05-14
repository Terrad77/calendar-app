import googleLogo from '../../assets/icons/google-logo.svg';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function GoogleAuthBtn() {
  const { t } = useTranslation(['auth']);
  const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001';

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="w-full text-center text-sm text-neutral-400">{t('or_google')}</p>
      <motion.a
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
        href={`${apiUrl}/api/auth/google`}
        className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-950 transition-all hover:bg-neutral-50 active:scale-95"
      >
        <img src={googleLogo} alt="Google" className="h-5 w-5" />
        <span>{t('sign_in_with_google')}</span>
      </motion.a>
    </div>
  );
}
