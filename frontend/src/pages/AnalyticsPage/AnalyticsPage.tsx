import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './AnalyticsPage.module.css';

export default function AnalyticsPage() {
  const { t } = useTranslation('navigation');

  const trendData = [
    { label: t('mon'), value: 52 },
    { label: t('tue'), value: 81 },
    { label: t('wed'), value: 68 },
    { label: t('thu'), value: 92 },
    { label: t('fri'), value: 61 },
    { label: t('sat'), value: 28 },
    { label: t('sun'), value: 18 },
  ];

  const focusWindows = [
    { time: '08:30 - 10:00', label: t('deep_work') },
    { time: '11:00 - 12:30', label: t('team_syncs') },
    { time: '15:00 - 16:30', label: t('review_window') },
  ];

  return (
    <NavigationPageShell
      badge={t('analytics')}
      title={t('analytics_title')}
      description={t('analytics_description')}
      stats={[
        { label: t('active_events'), value: '42', detail: t('active_events_detail') },
        { label: t('focus_rate'), value: '87%', detail: t('focus_rate_detail') },
        {
          label: t('recurring_plans'),
          value: '12',
          detail: t('recurring_plans_detail'),
        },
      ]}
      panels={[
        {
          title: t('weekly_pattern'),
          items: [
            t('weekly_pattern_item_1'),
            t('weekly_pattern_item_2'),
            t('weekly_pattern_item_3'),
          ],
        },
        {
          title: t('suggested_actions'),
          items: [
            t('suggested_actions_item_1'),
            t('suggested_actions_item_2'),
            t('suggested_actions_item_3'),
          ],
        },
      ]}
    >
      <div className={styles.grid}>
        <section className={styles.chartCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>{t('weekly_rhythm')}</p>
              <h2 className={styles.sectionTitle}>{t('meeting_density_by_day')}</h2>
            </div>
            <span className={styles.sectionPill}>{t('live_snapshot')}</span>
          </div>

          <div className={styles.barChart}>
            {trendData.map((item) => (
              <div key={item.label} className={styles.barItem}>
                <div className={styles.barTrack} aria-hidden="true">
                  <div className={styles.barFill} style={{ height: `${item.value}%` }} />
                </div>
                <span className={styles.barLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.insightCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>{t('best_windows')}</p>
              <h2 className={styles.sectionTitle}>{t('calendar_stays_calm')}</h2>
            </div>
          </div>

          <div className={styles.focusList}>
            {focusWindows.map((window) => (
              <article key={window.time} className={styles.focusItem}>
                <strong>{window.time}</strong>
                <span>{window.label}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </NavigationPageShell>
  );
}
