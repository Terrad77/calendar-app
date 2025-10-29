import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import css from '../SignUpForm/SignUpForm.module.css';
import Icon from '../Icon';
import clsx from 'clsx';
import { useDispatch, useSelector } from 'react-redux';
import { register as registerUser } from '../../redux/user/operations';
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

export default function SignUpForm() {
  const dispatch = useDispatch<AppDispatch>();
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isLoading = useSelector(selectIsLoading);
  const { t, i18n } = useTranslation();

  // object config parameters for useForm hook
  const {
    register, // from react-hook-form to register inputs
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    mode: 'onChange',
  });

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // handler form submit
  const handleFormSubmit = async (data: SignUpFormData) => {
    const { email, password } = data;
    const name = email.split('@')[0] || 'User';

    try {
      await dispatch(registerUser({ name, email, password })).unwrap();
      toast.success('Register successful');
      reset();
      setIsModalOpen(true);
    } catch (error: unknown) {
      // safe type error handling
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const registerError = error as RegisterError;
        console.error('Registration failed:', registerError.message);
        toast.error(registerError.message);
      } else {
        console.error('Unexpected error:', error);
        toast.error('Registration failed');
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
        <div
          className={clsx(css.inputGroup, {
            [css.inputGroupUk]: i18n.language === 'uk',
          })}
        >
          <label>{t('email user')}</label>
          <input
            type="text"
            placeholder={t('enter email')}
            autoComplete="off"
            className={clsx(css.inputGroupInput, errors.email && css.inputError, {
              [css.inputGroupInputUk]: i18n.language === 'uk',
            })}
            {...register('email')}
          />
          {errors.email && <p className={css.error}>{errors.email.message}</p>}
        </div>
        <div
          className={clsx(css.inputGroup, {
            [css.inputGroupUk]: i18n.language === 'uk',
          })}
        >
          <label>{t('password user')}</label>
          <div className={css.passwordContainer}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('Enter password')}
              autoComplete="new-password"
              className={clsx(css.inputGroupInput, errors.password && css.inputError, {
                [css.inputGroupInputUk]: i18n.language === 'uk',
              })}
              {...register('password')}
            />
            <button
              type="button"
              className={css.passwordToggle}
              onClick={toggleShowPassword}
              tabIndex={-1}
            >
              {showPassword ? (
                <Icon className={css.icon} name="eye" />
              ) : (
                <Icon className={css.icon} name="eyeOff" />
              )}
            </button>
          </div>
          {errors.password && <p className={css.error}>{errors.password.message}</p>}
        </div>
        <div
          className={clsx(css.inputGroup, {
            [css.inputGroupUk]: i18n.language === 'uk',
          })}
        >
          <label>{t('repeat password')}</label>
          <div className={css.passwordContainer}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('Repeat password')}
              autoComplete="password-confirmation"
              {...register('repeatPassword')}
              className={clsx(css.inputGroupInput, errors.repeatPassword && css.inputError, {
                [css.inputGroupInputUk]: i18n.language === 'uk',
              })}
            />
            <button
              type="button"
              className={css.passwordToggle}
              onClick={toggleShowPassword}
              tabIndex={-1}
            >
              {showPassword ? (
                <Icon className={css.icon} name="eye" />
              ) : (
                <Icon className={css.icon} name="eyeOff" />
              )}
            </button>
          </div>
          {errors.repeatPassword && <p className={css.error}>{errors.repeatPassword.message}</p>}
        </div>

        <button
          className={clsx(css.submitButton, {
            [css.submitButtonUk]: i18n.language === 'uk',
          })}
          type="submit"
          disabled={!isValid || isLoading}
        >
          {isLoading ? <DotLoader text={t('loading')} /> : t('register user form')}
        </button>
        <GoogleAuthBtn />
      </form>
    </>
  );
}
