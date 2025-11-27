import { useEffect } from 'react';
import css from './Modal.module.css';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import Icon from '../Icon';
import DotLoader from '../DotLoader/DotLoader.js';
import { useSelector } from 'react-redux';
import { selectIsLoading } from '../../redux/user/selectors';
import { ModalProps } from '../../types/types';

export default function Modal({ children, isOpen, onClose, btnClassName }: ModalProps) {
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

  return (
    <>
      {createPortal(
        <div className={css.backdrop} onClick={onClose}>
          {isLoading && <DotLoader text="Loading..." />}
          <div className={css.modal} onClick={(e) => e.stopPropagation()}>
            <button className={clsx(css.closeButton, btnClassName)} onClick={onClose}>
              <Icon name="x-close" className={(css.closeIcon, css.responsiveIcon)} />
            </button>
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
