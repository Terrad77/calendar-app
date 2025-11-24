import { useNavigate } from 'react-router-dom';
import css from '../SignUpModal/SignUpModal.module.css';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export default function SignUpModal() {
  const { t } = useTranslation(['common']); // namespaces for translation
  const navigate = useNavigate();

  const handleCancelClick = () => {
    navigate('/signin');
  };

  return (
    <>
      <h3 className={clsx(css.title)}>{t('verify_email')}</h3>
      <p className={css.text}>{t('check_email')}</p>
      <button className={css.okBtn} type="button" onClick={handleCancelClick}>
        Ok
      </button>
    </>
  );
}
