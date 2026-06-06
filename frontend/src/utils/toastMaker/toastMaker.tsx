import toast from 'react-hot-toast';
import css from '../toastMaker/toastMaker.module.css';
import Icon from '../../components/Icon';
import type { IconName } from '../../types/calendar.types';

type ToastStatus = 'success' | 'error';

export default function toastMaker(text: string, status?: ToastStatus): string {
  const render = (iconName: IconName, textClass: string) => (t: { id: string }) => (
    <div className={css.toastContainer}>
      <Icon
        name={iconName}
        className={textClass === css.toastError ? css.iconError : css.iconSuccess}
      />
      <span className={textClass}>{text}</span>
      <button className={css.toastCloseBtn} onClick={() => toast.dismiss(t.id)} aria-label="close">
        ×
      </button>
    </div>
  );

  switch (status) {
    case 'success':
      return '';

    case 'error':
      return toast(render('x-close', css.toastError));

    default:
      return toast(render('clock', css.toastSuccess));
  }
}
