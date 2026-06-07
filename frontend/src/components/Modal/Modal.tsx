import { useEffect } from 'react';
import css from './Modal.module.css';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Icon from '../Icon';
import Logo from '../Logo/Logo';
import DotLoader from '../DotLoader/DotLoader';
import { useSelector } from 'react-redux';
import { selectIsLoading } from '../../redux/user/selectors';
import type { ModalProps } from '../../types/auth.types';
import { useTranslation } from 'react-i18next';

export default function Modal({
  children,
  isOpen,
  onClose,
  btnClassName,
  showLogo,
  size,
}: ModalProps) {
  const { t } = useTranslation('common');
  useEffect(() => {
    // Handle Escape key to close modal
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.classList.add('modalIsOpen');
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.classList.remove('modalIsOpen');
      document.removeEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.classList.remove('modalIsOpen');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const isLoading = useSelector(selectIsLoading);

  if (!isOpen) {
    return null;
  }
  // createPortal(children, container);
  return createPortal(
    <div className={css.backdrop} onClick={onClose}>
      {isLoading && <DotLoader text={t('loading')} />}
      <div
        className={clsx(css.modal, size === 'small' && css.modalSmall)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx(css.modalHeader, !showLogo && css.modalHeaderNoLogo)}>
          {showLogo && (
            <div className={css.logoContainer}>
              <Logo />
            </div>
          )}

          <button className={clsx(css.closeButton, btnClassName)} onClick={onClose} type="button">
            <Icon name="x-close" className={clsx(css.closeIcon, css.responsiveIcon)} />
          </button>
        </div>

        <div className={css.modalInner}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
