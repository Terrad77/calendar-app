import { useDispatch, useSelector } from 'react-redux';
import css from '../LogOutModal/LogOutModal.module.css';
import { logout } from '../../redux/user/operations';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { selectIsLoading } from '../../redux/user/selectors';
import DotLoader from '../DotLoader/DotLoader';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ModalProps } from '../../types/types';
import type { AppDispatch } from '../../redux/types';

export default function LogOutModal({ isOpen, onClose }: ModalProps) {
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  // Do not render the modal if isOpen is false
  if (!isOpen) return null;

  const onClick = () => {
    dispatch(logout())
      .unwrap()
      .then(() => onClose())
      .catch((error: unknown) => {
        if (error instanceof Error) {
          toastMaker(t('sorry_try_again_later', { ns: 'common' }));
        } else {
          toastMaker(t('sorry_try_again_later', { ns: 'common' }));
        }
      });
  };

  return (
    <div className={css.modal}>
      <h3 className={clsx(css.title)}>{t('log_out')}</h3>
      <p className={clsx(css.text)}>{t('do_you_really')}</p>
      <div className={css.btnWrap}>
        <button className={clsx(css.logoutBtn)} type="button" onClick={onClick}>
          {isLoading ? <DotLoader text={t('logging_out')} /> : t('log_out')}
        </button>
        <button className={clsx(css.cancelBtn)} type="button" onClick={onClose}>
          {t('log_exit')}
        </button>
      </div>
    </div>
  );
}
