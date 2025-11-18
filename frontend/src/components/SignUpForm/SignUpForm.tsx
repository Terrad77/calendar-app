import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import css from './SignUpForm.module.css';
import Icon from '../Icon';
import clsx from 'clsx';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../redux/user/operations';
import GoogleAuthBtn from '../GoogleAuthBtn/GoogleAuthBtn';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader.js';
import { useTranslation } from 'react-i18next';
import SignUpModal from '../SignUpModal/SignUpModal';
import Modal from '../Modal/Modal.js';
import { signUpSchema } from '../../schemas/validationSchemas';
import { SignUpFormData, RegisterError } from '../../types/types';
import toast from 'react-hot-toast';
import { AppDispatch } from '../../redux/types';
import { useTogglePassword } from '../../hooks/useTogglePassword';

export default function SignUpForm() {
  const dispatch = useDispatch<AppDispatch>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isLoading = useSelector(selectIsLoading);
  const { t, i18n } = useTranslation(['form', 'validation']);

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

  const handleFormSubmit = async (data: SignUpFormData) => {
    const { email, password } = data;
    const name = email.split('@')[0] || 'User';

    try {
      await dispatch(registerUser({ name, email, password })).unwrap();
      toast.success(t('register_successful', { ns: 'common' }));
      reset();
      setIsModalOpen(true);
    } catch (error: unknown) {
      // Error handling
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const registerError = error as RegisterError;
        console.error('Registration failed:', registerError.message);
        toast.error(registerError.message);
      } else {
        console.error('Unexpected error:', error);
        toast.error(t('registration_failed', { ns: 'common' }));
      }
    }
  };

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
      <form className={css.form} onSubmit={handleSubmit(handleFormSubmit)}>
        <div className={clsx(css.inputGroup, i18n.language === 'uk')}>
          <label>{t('email_user', { ns: 'form' })}</label>
          <input
            type="text"
            placeholder={t('enter_email', { ns: 'form' })}
            autoComplete="off"
            className={clsx(
              css.inputGroupInput,
              errors.email && css.inputError,
              i18n.language === 'uk'
            )}
            {...register('email')}
          />
          {errors.email && (
            <p className={css.error}>
              {t(errors.email.message || 'email_required', { ns: 'validation' })}
            </p>
          )}
        </div>
        <div className={clsx(css.inputGroup, i18n.language === 'uk')}>
          <label>{t('password_user', { ns: 'form' })}</label>
          <div className={css.passwordContainer}>
            <input
              type={passwordField.inputType}
              placeholder={t('enter_password', { ns: 'form' })}
              autoComplete="new-password"
              className={clsx(
                css.inputGroupInput,
                errors.password && css.inputError,
                i18n.language === 'uk'
              )}
              {...register('password')}
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
        <div className={clsx(css.inputGroup, i18n.language === 'uk')}>
          <label>{t('repeat_password', { ns: 'form' })}</label>
          <div className={css.passwordContainer}>
            <input
              type={repeatPasswordField.inputType}
              placeholder={t('repeat_password_placeholder', { ns: 'form' })}
              autoComplete="password-confirmation"
              {...register('repeatPassword')}
              className={clsx(
                css.inputGroupInput,
                errors.repeatPassword && css.inputError,
                i18n.language === 'uk'
              )}
            />
            <button
              type="button"
              className={clsx(css.passwordToggle, 'no-transform')}
              onClick={repeatPasswordField.toggle}
              tabIndex={-1}
              aria-label={repeatPasswordField.ariaLabel}
            >
              <Icon className={css.icon} name={repeatPasswordField.iconName} />
            </button>
          </div>
          {errors.repeatPassword && (
            <p className={css.error}>
              {t(errors.repeatPassword.message || 'passwords_must_match', { ns: 'validation' })}
            </p>
          )}
        </div>

        <button
          className={clsx(css.submitButton, i18n.language === 'uk')}
          type="submit"
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <DotLoader text={t('signing_up', { ns: 'form' })} />
          ) : (
            t('register_user', { ns: 'form' })
          )}
        </button>
        <GoogleAuthBtn />
      </form>
    </>
  );
}
