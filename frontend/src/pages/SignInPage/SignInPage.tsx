import { Link } from 'react-router-dom';
import Logo from '../../components/Logo/Logo';
import SignInForm from '../../components/SignInForm/SignInForm';
import { useTranslation } from 'react-i18next';

export default function SignInPage() {
  const { t } = useTranslation(['auth', 'form']);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 sm:mb-12">
        <Logo />
      </div>
      <div className="w-full max-w-sm">
        <h2 className="text-center text-2xl font-semibold text-neutral-950 sm:text-3xl mb-8 sm:mb-10">
          {t('signing_in', { ns: 'form' })}
        </h2>
        <SignInForm />
        <p className="mt-6 text-center text-sm text-neutral-600 sm:text-base">
          {t('do_not', { ns: 'auth' })}{' '}
          <Link
            className="font-semibold text-neutral-950 transition-colors hover:text-neutral-700"
            to="/signup"
          >
            {t('register_user', { ns: 'auth' })}
          </Link>
        </p>
      </div>
    </div>
  );
}
