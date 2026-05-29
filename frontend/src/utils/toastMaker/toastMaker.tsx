import toast from 'react-hot-toast';
import css from '../toastMaker/toastMaker.module.css';
import Icon from '../../components/Icon';

type ToastStatus = 'success' | 'error';

export default function toastMaker(text: string, status?: ToastStatus): string {
  const render = (iconName: string, textClass: string) => (t: { id: string }) => (
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
      // Success toasts are intentionally suppressed — prefer inline success messages
      // for forms and lightweight UI feedback. Keep toasts only for errors and
      // global notifications.
      return '';

    case 'error':
      return toast(render('x-close', css.toastError));

    default:
      // Default / global messages still use toasts
      return toast(render('clock', css.toastSuccess));
  }
}
