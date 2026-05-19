import { Link } from 'react-router-dom';
import Logo from '../Logo/Logo';
import { useTranslation } from 'react-i18next';
import styles from './WelcomeSection.module.css';

export default function WelcomeSection() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <div className={styles.glowPrimary} />
      <div className={styles.glowSecondary} />

      <div className={styles.shell}>
        <header className={styles.header}>
          <Logo />
          <p className={styles.headerTag}>{t('personal_planning_polished')}</p>
        </header>

        <section className={styles.hero}>
          <div className={styles.copy}>
            <span className={styles.kicker}>{t('calendair_workspace')}</span>
            <h1 className={styles.title}>{t('calendar_app')}</h1>
            <p className={styles.subtitle}>{t('daily_online_planner')}</p>

            <div className={styles.actions}>
              <Link to="/signup" className={styles.primaryAction}>
                <span>{t('register_user')}</span>
                <small>{t('create_new_workspace')}</small>
              </Link>
              <Link to="/signin" className={styles.secondaryAction}>
                <span>{t('login_user')}</span>
                <small>{t('continue_with_account')}</small>
              </Link>
            </div>

            <div className={styles.microRow}>
              <span>{t('fast_calendar_setup')}</span>
              <span>{t('ai_assistant_ready')}</span>
              <span>{t('branded_team_shell')}</span>
            </div>
          </div>

          <div className={styles.preview} aria-hidden="true">
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <span className={styles.previewBadge}>{t('preview_today')}</span>
                <span className={styles.previewTime}>{t('preview_working_hours')}</span>
              </div>

              <div className={styles.previewTimeline}>
                <div className={styles.previewEvent}>
                  <strong>{t('preview_event_product_sync')}</strong>
                  <span>10:30</span>
                </div>
                <div className={styles.previewEventAccent}>
                  <strong>{t('preview_event_focus_block')}</strong>
                  <span>12:00</span>
                </div>
                <div className={styles.previewEvent}>
                  <strong>{t('preview_event_review_notes')}</strong>
                  <span>15:45</span>
                </div>
              </div>

              <div className={styles.previewFooter}>
                <div>
                  <p>{t('smart_routing')}</p>
                  <strong>{t('choose_sign_in_signup')}</strong>
                </div>
                <span className={styles.previewDot} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
