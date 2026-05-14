import { Link } from 'react-router-dom';
import Logo from '../Logo/Logo';
import { useTranslation } from 'react-i18next';

export default function WelcomeSection() {
  const { t } = useTranslation(['auth', 'common']);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 sm:mb-16">
        <Logo />
      </div>
      <div className="mb-12 text-center sm:mb-16">
        <h1 className="text-4xl font-bold text-neutral-950 sm:text-5xl lg:text-6xl mb-4 sm:mb-6">
          {t('calendar_app')}
        </h1>
        <h2 className="text-lg text-neutral-600 sm:text-xl lg:text-2xl font-light">
          {t('daily_online_planner')}
        </h2>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          to="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-neutral-950 px-6 py-3 text-center font-semibold text-white transition-all hover:bg-neutral-800 active:scale-95"
        >
          {t('register_user')}
        </Link>
        <Link
          to="/signin"
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-6 py-3 text-center font-semibold text-neutral-950 transition-all hover:bg-neutral-50 active:scale-95"
        >
          {t('login_user')}
        </Link>
      </div>
    </div>
  );
}
