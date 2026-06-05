import { useNavigate } from 'react-router-dom';
import styles from '../VerificationPage/VerificationPage.module.css';

export default function VerificationSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emailIcon}>✅</div>
        <h1 className={styles.title}>Email verified!</h1>
        <p className={styles.description}>
          Your account has been successfully verified. You can now sign in and start using the
          calendar.
        </p>
        <button
          className={styles.proceedButton}
          onClick={() => navigate('/signin', { replace: true })}
        >
          Proceed to Login
        </button>
      </div>
    </div>
  );
}
