import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../redux/user/operations';
import { useDispatch, useSelector } from 'react-redux';
import GoogleAuthBtn from '../GoogleAuthBtn/GoogleAuthBtn';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../../components/DotLoader/DotLoader.jsx';
import { signInSchema } from '../../schemas/validationSchemas';
import { SignInFormData } from '../../types/types';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AppDispatch } from '../../redux/types';
import { useTogglePassword } from '../../hooks/useTogglePassword';
import { Eye, EyeOff } from 'lucide-react';

export default function SignInForm() {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector(selectIsLoading);
  const { t } = useTranslation(['form', 'validation']);
  const navigate = useNavigate();

  // Password visibility toggle
  const passwordField = useTogglePassword();

  // Form configuration
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignInFormData>({
    resolver: yupResolver(signInSchema),
    mode: 'onChange',
  });

  // Form submission handler
  const handleFormSubmit = async (data: SignInFormData) => {
    try {
      console.log('Starting login with data:', data);
      const result = await dispatch(loginUser(data)).unwrap();
      console.log('Login successful, result:', result);

      toast.success(t('login_successful', { ns: 'common' }));

      console.log('Before navigate - current path:', window.location.pathname);
      navigate('/');
      console.log('After navigate - this should execute immediately');
    } catch (error: unknown) {
      console.log('Login error details:', error);

      if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          const loginError = error as { message: string };
          console.error('Login failed with message:', loginError.message);
          toast.error(loginError.message);
        } else if ('payload' in error) {
          const thunkError = error as { payload: string };
          console.error('Login failed with payload:', thunkError.payload);
          toast.error(thunkError.payload);
        }
      } else {
        console.error('Unexpected error type:', error);
        toast.error(t('login_failed', { ns: 'common' }));
      }
    }
  };

  return (
    <form className="flex flex-col gap-6 sm:gap-7" onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Email input field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="email-input" className="text-sm font-medium text-neutral-950 sm:text-base">
          {t('email_user', { ns: 'form' })}
        </label>
        <input
          id="email-input"
          className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none sm:text-base ${
            errors.email
              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
              : 'border-neutral-300 bg-white focus:ring-2 focus:ring-neutral-950'
          }`}
          type="text"
          placeholder={t('enter_email', { ns: 'form' })}
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-red-600 sm:text-sm">
            {t(errors.email.message || 'email_required', { ns: 'validation' })}
          </p>
        )}
      </div>

      {/* Password input field with visibility toggle */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password-input"
          className="text-sm font-medium text-neutral-950 sm:text-base"
        >
          {t('password_user', { ns: 'form' })}
        </label>
        <div className="relative flex items-center">
          <input
            id="password-input"
            type={passwordField.inputType}
            placeholder={t('enter_password', { ns: 'form' })}
            autoComplete="current-password"
            {...register('password')}
            className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm transition-all focus:outline-none sm:text-base ${
              errors.password
                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                : 'border-neutral-300 bg-white focus:ring-2 focus:ring-neutral-950'
            }`}
          />
          <button
            type="button"
            className="absolute right-4 p-1 text-neutral-400 transition-colors hover:text-neutral-600"
            onClick={passwordField.toggle}
            tabIndex={-1}
            aria-label={passwordField.ariaLabel}
          >
            {passwordField.inputType === 'password' ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 sm:text-sm">
            {t(errors.password.message || 'password_required', { ns: 'validation' })}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="flex w-full items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-center font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 sm:mt-2"
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <DotLoader text={t('signing_in', { ns: 'form' })} />
        ) : (
          t('login_user', { ns: 'auth' })
        )}
      </button>

      {/* Google authentication button */}
      <GoogleAuthBtn />
    </form>
  );
}
