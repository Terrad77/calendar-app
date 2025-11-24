import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import css from '../SignInForm/SignInForm.module.css';
import Icon from '../Icon';
import clsx from 'clsx';
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
    <form className={css.form} onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Email input field */}
      <div className={clsx(css.inputGroup)}>
        <label htmlFor="email-input">{t('email_user', { ns: 'form' })}</label>
        <input
          id="email-input"
          className={clsx(css.inputGroupInput, errors.email && css.inputError)}
          type="text"
          placeholder={t('enter_email', { ns: 'form' })}
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <p className={css.error}>
            {t(errors.email.message || 'email_required', { ns: 'validation' })}
          </p>
        )}
      </div>

      {/* Password input field with visibility toggle */}
      <div className={clsx(css.inputGroup)}>
        <label htmlFor="password-input">{t('password_user', { ns: 'form' })}</label>
        <div className={css.passwordContainer}>
          <input
            id="password-input"
            type={passwordField.inputType}
            placeholder={t('enter_password', { ns: 'form' })}
            autoComplete="current-password"
            {...register('password')}
            className={clsx(css.inputGroupInput, errors.password && css.inputError)}
          />
          <button
            type="button"
            className={clsx(css.passwordToggle, 'no-transform')}
            onClick={passwordField.toggle}
            tabIndex={-1}
            aria-label={passwordField.ariaLabel}
          >
            <Icon className={css.icon} name={passwordField.iconName} />
          </button>
        </div>
        {errors.password && (
          <p className={css.error}>
            {t(errors.password.message || 'password_required', { ns: 'validation' })}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button type="submit" className={clsx(css.submitButton)} disabled={!isValid || isLoading}>
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
