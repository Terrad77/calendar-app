import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from '../VerificationPage/VerificationPage.module.css';

export default function VerificationFailedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const getMessage = () => {
    if (reason === 'missing_token') return 'The verification link is missing a token.';
    if (reason && reason.includes('expired')) return 'The verification link has expired.';
    if (reason) return decodeURIComponent(reason);
    return 'The verification link is invalid or has already been used.';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emailIcon}>❌</div>
        <h1 className={styles.title}>Verification failed</h1>
        <p className={styles.description}>{getMessage()}</p>
        <p className={styles.resendNote}>
          Please register again or contact support if this keeps happening.
        </p>
        <button
          className={styles.proceedButton}
          onClick={() => navigate('/signup', { replace: true })}
        >
          Back to Sign Up
        </button>
      </div>
    </div>
  );
}
