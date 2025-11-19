import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
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
  const { t, i18n } = useTranslation(['form', 'validation']);

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

  const handleFormSubmit = async (data: SignInFormData) => {
    try {
      await dispatch(loginUser(data)).unwrap();
      toast.success(t('login_successful', { ns: 'common' }));
    } catch (error: unknown) {
      // Error handling
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const loginError = error as { message: string };
        console.error('Login failed:', loginError.message);
        toast.error(loginError.message);
      } else {
        console.error('Unexpected error:', error);
        toast.error(t('login_failed', { ns: 'common' }));
      }
    }
  };

  return (
    <form className={css.form} onSubmit={handleSubmit(handleFormSubmit)}>
      {/* Email input field */}
      <div className={clsx(css.inputGroup, i18n.language === 'uk')}>
        <label>{t('email_user', { ns: 'form' })}</label>
        <input
          className={clsx(
            css.inputGroupInput,
            errors.email && css.inputError,
            i18n.language === 'uk'
          )}
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
      <div className={clsx(css.inputGroup, i18n.language === 'uk')}>
        <label>{t('password_user', { ns: 'form' })}</label>
        <div className={css.passwordContainer}>
          <input
            type={passwordField.inputType}
            placeholder={t('enter_password', { ns: 'form' })}
            autoComplete="current-password"
            {...register('password')}
            className={clsx(
              css.inputGroupInput,
              errors.password && css.inputError,
              i18n.language === 'uk'
            )}
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
      <button
        type="submit"
        className={clsx(css.submitButton, {
          [css.submitButtonUk]: i18n.language === 'uk',
        })}
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
