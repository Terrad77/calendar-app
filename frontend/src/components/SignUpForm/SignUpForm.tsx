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
import { SignUpFormData, RegisterError } from '../../types/types';
import toast from 'react-hot-toast';
import { AppDispatch } from '../../redux/types';
import { useTogglePassword } from '../../hooks/useTogglePassword';
import { Eye, EyeOff } from 'lucide-react';

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
      toast.success(t('register_successful', { ns: 'common' }));
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
      <form className="flex flex-col gap-6 sm:gap-7" onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="flex flex-col gap-2">
          {/* Email field */}
          <label htmlFor="email" className="text-sm font-medium text-neutral-950 sm:text-base">
            {t('email_user', { ns: 'form' })}
          </label>
          <input
            type="text"
            placeholder={t('enter_email', { ns: 'form' })}
            autoComplete="off"
            className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none sm:text-base ${
              errors.email
                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                : 'border-neutral-300 bg-white focus:ring-2 focus:ring-neutral-950'
            }`}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-600 sm:text-sm">
              {t(errors.email.message || 'email_required', { ns: 'validation' })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {/* Password field */}
          <label htmlFor="password" className="text-sm font-medium text-neutral-950 sm:text-base">
            {t('password_user', { ns: 'form' })}
          </label>
          <div className="relative flex items-center">
            <input
              type={passwordField.inputType}
              placeholder={t('enter_password', { ns: 'form' })}
              autoComplete="new-password"
              className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm transition-all focus:outline-none sm:text-base ${
                errors.password
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                  : 'border-neutral-300 bg-white focus:ring-2 focus:ring-neutral-950'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-4 p-1 text-neutral-400 transition-colors hover:text-neutral-600"
              onClick={(e) => {
                e.stopPropagation();
                passwordField.toggle();
              }}
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
        <div className="flex flex-col gap-2">
          {/* Repeat Password field */}
          <label
            htmlFor="repeatPassword"
            className="text-sm font-medium text-neutral-950 sm:text-base"
          >
            {t('repeat_password', { ns: 'form' })}
          </label>
          <div className="relative flex items-center">
            <input
              type={repeatPasswordField.inputType}
              placeholder={t('repeat_password_placeholder', { ns: 'form' })}
              autoComplete="password-confirmation"
              {...register('repeatPassword')}
              className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm transition-all focus:outline-none sm:text-base ${
                errors.repeatPassword
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                  : 'border-neutral-300 bg-white focus:ring-2 focus:ring-neutral-950'
              }`}
            />
            <button
              type="button"
              className="absolute right-4 p-1 text-neutral-400 transition-colors hover:text-neutral-600"
              onClick={(e) => {
                e.stopPropagation();
                repeatPasswordField.toggle();
              }}
              tabIndex={-1}
              aria-label={repeatPasswordField.ariaLabel}
            >
              {repeatPasswordField.inputType === 'password' ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.repeatPassword && (
            <p className="text-xs text-red-600 sm:text-sm">
              {t(errors.repeatPassword.message || 'passwords_must_match', { ns: 'validation' })}
            </p>
          )}
        </div>

        <button
          className="flex w-full items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-center font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 sm:mt-2"
          type="submit"
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <DotLoader text={t('signing_up', { ns: 'form' })} />
          ) : (
            t('register_user', { ns: 'auth' })
          )}
        </button>
        <GoogleAuthBtn />
      </form>
    </>
  );
}
