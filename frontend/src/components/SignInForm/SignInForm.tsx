import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { logIn } from '../../redux/user/operations';
import { useDispatch, useSelector } from 'react-redux';
import GoogleAuthBtn from '../GoogleAuthBtn/GoogleAuthBtn';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader';
import { signInSchema } from '../../schemas/validationSchemas';
import type { SignInFormData } from '../../types/auth.types';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { AppDispatch } from '../../redux/types';
import { useTogglePassword } from '../../hooks/useTogglePassword';
import { Eye, EyeOff } from 'lucide-react';
import styles from './SignInForm.module.css';

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
      await dispatch(logIn(data)).unwrap();

      toastMaker(t('login_successful', { ns: 'common' }), 'success');
      navigate('/');
    } catch (error: unknown) {
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
    <form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
      <div className={styles.inputGroup}>
        <label htmlFor="email-input">{t('email_user', { ns: 'form' })}</label>
        <input
          id="email-input"
          className={`${styles.inputGroupInput} ${errors.email ? styles.inputError : ''}`}
          type="text"
          placeholder={t('enter_email', { ns: 'form' })}
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <p className={styles.error}>
            {t(errors.email.message || 'email_required', { ns: 'validation' })}
          </p>
        )}
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="password-input">{t('password_user', { ns: 'form' })}</label>
        <div className={styles.passwordContainer}>
          <input
            id="password-input"
            type={passwordField.inputType}
            placeholder={t('enter_password', { ns: 'form' })}
            autoComplete="current-password"
            {...register('password')}
            className={`${styles.inputGroupInput} ${errors.password ? styles.inputError : ''}`}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={passwordField.toggle}
            tabIndex={-1}
            aria-label={passwordField.ariaLabel}
          >
            {passwordField.inputType === 'password' ? (
              <Eye className={styles.icon} />
            ) : (
              <EyeOff className={styles.icon} />
            )}
          </button>
        </div>
        {errors.password && (
          <p className={styles.error}>
            {t(errors.password.message || 'password_required', { ns: 'validation' })}
          </p>
        )}
      </div>

      <button type="submit" className={styles.submitButton} disabled={!isValid || isLoading}>
        {isLoading ? (
          <DotLoader text={t('signing_in', { ns: 'form' })} />
        ) : (
          t('login_user', { ns: 'auth' })
        )}
      </button>

      <div className={styles.googleAuthWrapper}>
        <GoogleAuthBtn />
      </div>
    </form>
  );
}
