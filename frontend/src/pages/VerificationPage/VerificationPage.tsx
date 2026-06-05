import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '../../hooks/useDemoMode';
import styles from './VerificationPage.module.css';

const VerificationPage = () => {
  const navigate = useNavigate();
  const { isDemoMode, isLoading } = useDemoMode();

  // In demo mode verification is skipped on the server — go straight to the app.
  useEffect(() => {
    if (!isLoading && isDemoMode) {
      navigate('/calendar', { replace: true });
    }
  }, [isDemoMode, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.demoBanner}>
            <span className={styles.demoBadge}>Demo</span>
            Email verification is disabled in demo mode.
          </div>
          <h1 className={styles.title}>You&apos;re all set!</h1>
          <p className={styles.description}>
            Your account was verified automatically. Click below to open the calendar.
          </p>
          <button
            className={styles.proceedButton}
            onClick={() => navigate('/calendar', { replace: true })}
          >
            Proceed to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emailIcon}>📧</div>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.description}>
          We sent a verification link to your email address. Click the link to activate your account
          and start using the calendar.
        </p>
        <p className={styles.resendNote}>
          Didn&apos;t receive an email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  );
};

export default VerificationPage;
