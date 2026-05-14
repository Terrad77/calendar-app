import { NavLink } from 'react-router-dom';
import Logo from '../../components/Logo/Logo';
import SignUpForm from '../../components/SignUpForm/SignUpForm';
import { useTranslation } from 'react-i18next';

export default function SignUpPage() {
  const { t } = useTranslation(['auth', 'form']);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 sm:mb-12">
        <Logo />
      </div>
      <div className="w-full max-w-sm">
        <h2 className="text-center text-2xl font-semibold text-neutral-950 sm:text-3xl mb-8 sm:mb-10">
          {t('register_user', { ns: 'form' })}
        </h2>
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-neutral-600 sm:text-base">
          {t('already_have', { ns: 'auth' })}{' '}
          <NavLink
            className="font-semibold text-neutral-950 transition-colors hover:text-neutral-700"
            to="/signin"
          >
            {t('login_user', { ns: 'auth' })}
          </NavLink>
        </p>
      </div>
    </div>
  );
}
