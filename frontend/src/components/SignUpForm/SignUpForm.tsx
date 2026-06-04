import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../redux/user/operations';
import GoogleAuthBtn from '../GoogleAuthBtn/GoogleAuthBtn';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader.js';
import { useTranslation } from 'react-i18next';
import SignUpModal from '../SignUpModal/SignUpModal';
import Modal from '../Modal/Modal.js';
import { signUpSchema } from '../../schemas/validationSchemas';
import type { RegisterError, SignUpFormData } from '../../types/auth.types';
import toast from 'react-hot-toast';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { AppDispatch } from '../../redux/types';
import { useTogglePassword } from '../../hooks/useTogglePassword';
import { Eye, EyeOff } from 'lucide-react';
import styles from './SignUpForm.module.css';

export default function SignUpForm() {
  const dispatch = useDispatch<AppDispatch>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isLoading = useSelector(selectIsLoading);
  const { t } = useTranslation(['form', 'validation']);

  // Password visibility toggles
  const passwordField = useTogglePassword();
  const repeatPasswordField = useTogglePassword();

  // configure useForm
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    mode: 'onChange',
  });

  // function to handle form submission
  const handleFormSubmit = async (data: SignUpFormData) => {
    const { email, password } = data;
    const name = email.split('@')[0] || 'User';

    try {
      await dispatch(registerUser({ name, email, password })).unwrap();
      toastMaker(t('register_successful', { ns: 'common' }), 'success');
      reset();
      setIsModalOpen(true);
    } catch (error: unknown) {
      // Error handling
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const registerError = error as RegisterError;
        toast.error(registerError.message);
      } else {
        console.error('Unexpected error:', error);
        toast.error(t('registration_failed', { ns: 'common' }));
      }
    }
  };

  // function to handle modal close
  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleModalCancel} btnClassName={''}>
          <SignUpModal />
        </Modal>
      )}
      <form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">{t('email_user', { ns: 'form' })}</label>
          <input
            id="email"
            type="text"
            placeholder={t('enter_email', { ns: 'form' })}
            autoComplete="email"
            className={`${styles.inputGroupInput} ${errors.email ? styles.inputError : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <p className={styles.error}>
              {t(errors.email.message || 'email_required', { ns: 'validation' })}
            </p>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">{t('password_user', { ns: 'form' })}</label>
          <div className={styles.passwordContainer}>
            <input
              id="password"
              type={passwordField.inputType}
              placeholder={t('enter_password', { ns: 'form' })}
              autoComplete="new-password"
              className={`${styles.inputGroupInput} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
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

        <div className={styles.inputGroup}>
          <label htmlFor="repeatPassword">{t('repeat_password', { ns: 'form' })}</label>
          <div className={styles.passwordContainer}>
            <input
              id="repeatPassword"
              type={repeatPasswordField.inputType}
              placeholder={t('repeat_password_placeholder', { ns: 'form' })}
              autoComplete="new-password"
              className={`${styles.inputGroupInput} ${errors.repeatPassword ? styles.inputError : ''}`}
              {...register('repeatPassword')}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={repeatPasswordField.toggle}
              tabIndex={-1}
              aria-label={repeatPasswordField.ariaLabel}
            >
              {repeatPasswordField.inputType === 'password' ? (
                <Eye className={styles.icon} />
              ) : (
                <EyeOff className={styles.icon} />
              )}
            </button>
          </div>
          {errors.repeatPassword && (
            <p className={styles.error}>
              {t(errors.repeatPassword.message || 'passwords_must_match', { ns: 'validation' })}
            </p>
          )}
        </div>

        <button className={styles.submitButton} type="submit" disabled={!isValid || isLoading}>
          {isLoading ? (
            <DotLoader text={t('signing_up', { ns: 'form' })} />
          ) : (
            t('register_user', { ns: 'auth' })
          )}
        </button>
        <div className={styles.googleAuthWrapper}>
          <GoogleAuthBtn />
        </div>
      </form>
    </>
  );
}
