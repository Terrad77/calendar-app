import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import css from './DeleteAccountModal.module.css';
import { deleteAccount } from '../../redux/user/operations';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { AppDispatch } from '../../redux/types';

type DeleteAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isFormValid = password.length > 0 && confirmed;

  const handleSubmit = () => {
    if (!isFormValid) return;

    dispatch(deleteAccount(password))
      .unwrap()
      .then(() => {
        setPassword('');
        setConfirmed(false);
        onClose();
        navigate('/');
      });
  };

  const handleClose = () => {
    setPassword('');
    setConfirmed(false);
    onClose();
  };

  return (
    <div className={css.modal}>
      <h3 className={css.title}>{t('delete_account', { ns: 'common' })}</h3>

      <div className={css.warningBox}>
        <span className={css.warningIcon}>⚠️</span>
        <p className={css.warningText}>{t('delete_account_warning', { ns: 'common' })}</p>
      </div>

      <div className={css.inputGroup}>
        <label htmlFor="password">{t('password', { ns: 'common' })}</label>
        <div className={css.passwordInput}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('enter_password', { ns: 'common' })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={css.toggleBtn}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div className={css.checkboxGroup}>
        <input
          id="confirm"
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <label htmlFor="confirm">{t('confirm_delete', { ns: 'common' })}</label>
      </div>

      <div className={css.btnWrap}>
        <button
          className={clsx(css.deleteBtn, { [css.disabled]: !isFormValid || isLoading })}
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <DotLoader text={t('deleting', { ns: 'common' })} />
          ) : (
            t('delete_account', { ns: 'common' })
          )}
        </button>
        <button className={css.cancelBtn} type="button" onClick={handleClose}>
          {t('cancel', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
}
