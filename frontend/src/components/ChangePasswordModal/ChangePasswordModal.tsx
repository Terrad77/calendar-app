import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import css from './ChangePasswordModal.module.css';
import { changePassword } from '../../redux/user/operations';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { AppDispatch } from '../../redux/types';

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isFormValid =
    oldPassword.length > 0 && newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = () => {
    if (!isFormValid) return;

    dispatch(changePassword({ oldPassword, newPassword }))
      .unwrap()
      .then(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      });
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className={css.modal}>
      <h3 className={css.title}>{t('change_password', { ns: 'common' })}</h3>

      <div className={css.inputGroup}>
        <label htmlFor="oldPassword">{t('current_password', { ns: 'common' })}</label>
        <div className={css.passwordInput}>
          <input
            id="oldPassword"
            type={showOldPassword ? 'text' : 'password'}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder={t('enter_current_password', { ns: 'common' })}
          />
          <button
            type="button"
            onClick={() => setShowOldPassword(!showOldPassword)}
            className={css.toggleBtn}
          >
            {showOldPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div className={css.inputGroup}>
        <label htmlFor="newPassword">{t('new_password', { ns: 'common' })}</label>
        <div className={css.passwordInput}>
          <input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('enter_new_password', { ns: 'common' })}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className={css.toggleBtn}
          >
            {showNewPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div className={css.inputGroup}>
        <label htmlFor="confirmPassword">{t('confirm_password', { ns: 'common' })}</label>
        <div className={css.passwordInput}>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('confirm_new_password', { ns: 'common' })}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className={css.toggleBtn}
          >
            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      {newPassword !== confirmPassword && confirmPassword.length > 0 && (
        <p className={css.error}>{t('passwords_do_not_match', { ns: 'common' })}</p>
      )}

      <div className={css.btnWrap}>
        <button
          className={clsx(css.changeBtn, { [css.disabled]: !isFormValid || isLoading })}
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <DotLoader text={t('changing', { ns: 'common' })} />
          ) : (
            t('change', { ns: 'common' })
          )}
        </button>
        <button className={css.cancelBtn} type="button" onClick={handleClose}>
          {t('cancel', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
}
