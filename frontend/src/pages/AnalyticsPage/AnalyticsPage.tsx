import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './AnalyticsPage.module.css';
import { useEffect, useState } from 'react';

type TrendPoint = { date: string; value: number };

export default function AnalyticsPage() {
  const { t } = useTranslation('navigation');
  const [overview, setOverview] = useState<{
    activeEvents: number;
    avgPerDay: number;
    recurringRate: number;
  } | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const API = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch(`${API}/api/analytics/overview`);
        if (res.ok) setOverview(await res.json());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load analytics overview', e);
      }
    };

    const fetchTrends = async () => {
      try {
        const res = await fetch(`${API}/api/analytics/trends?days=14`);
        if (res.ok) setTrends(await res.json());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load analytics trends', e);
      }
    };

    fetchOverview();
    fetchTrends();
  }, [API]);

  const maxValue = trends.length ? Math.max(...trends.map((p) => p.value)) : 0;

  return (
    <NavigationPageShell
      badge={t('analytics')}
      title={t('analytics_title')}
      description={t('analytics_description')}
      stats={
        overview
          ? [
              {
                label: t('active_events'),
                value: String(overview.activeEvents),
                detail: t('active_events_detail'),
              },
              {
                label: t('avg_per_day'),
                value: String(overview.avgPerDay),
                detail: t('avg_per_day_detail'),
              },
              {
                label: t('recurring_rate'),
                value: `${overview.recurringRate}%`,
                detail: t('recurring_plans_detail'),
              },
            ]
          : []
      }
      panels={[
        {
          title: t('weekly_pattern'),
          items: [t('weekly_pattern_item_1'), t('weekly_pattern_item_2')],
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
            {trends.length === 0 && <div>{t('loading')}</div>}
            {trends.map((point) => {
              const height = maxValue ? Math.round((point.value / maxValue) * 100) : 0;
              const label = new Date(point.date).toLocaleDateString();
              return (
                <div key={point.date} className={styles.barItem} title={`${label}: ${point.value}`}>
                  <div className={styles.barTrack} aria-hidden="true">
                    <div className={styles.barFill} style={{ height: `${height}%` }} />
                  </div>
                  <span className={styles.barLabel}>{label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </NavigationPageShell>
  );
}
