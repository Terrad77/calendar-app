import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './AnalyticsPage.module.css';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticationService } from '../../services/authService';
import dayjs from 'dayjs';
import type { CalendarEvent } from '../../types/calendar.types';
import Modal from '../../components/Modal/Modal';
import DotLoader from '../../components/DotLoader/DotLoader';
import { TaskInputForm } from '../../components/Calendar/TaskInputFormComponent/TaskInputFormComponent';
import { updateCalendarEvent } from '../../API/apiOperations';
import toastMaker from '../../utils/toastMaker/toastMaker';

const DayEventsModal = lazy(
  () => import('../../components/Calendar/DayEventsModalComponent/DayEventsModalComponent')
);

type TrendPoint = { date: string; value: number };
type AnalyticsEvent = {
  id: string;
  userId: string;
  eventType: CalendarEvent['eventType'];
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  createdAt: string;
  ownerId?: string;
};

type AnalyticsEventDetail = AnalyticsEvent & {
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  countryCode?: string | null;
  reminderTime?: string | null;
  isPublic?: boolean;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high' | null;
  colors?: CalendarEvent['colors'];
  participants?: string[];
  metadata?: Record<string, unknown>;
  updatedAt: string;
};

export default function AnalyticsPage() {
  const { t, i18n } = useTranslation('navigation');
  const [overview, setOverview] = useState<{
    activeEvents: number;
    avgPerDay: number;
    recurringRate: number;
  } | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<AnalyticsEvent[]>([]);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isAuth = authenticationService.isAuthenticated();

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await authenticationService.authenticatedFetch('/api/analytics/overview', {
          method: 'GET',
        });

        if (res.ok) setOverview(await res.json());
        else throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load analytics overview', e);
        toastMaker(t('analytics_error_overview', { ns: 'common' }), 'error');
      }
    };

    const fetchTrends = async () => {
      setTrendsLoading(true);
      try {
        const res = await authenticationService.authenticatedFetch('/api/analytics/trends?days=7', {
          method: 'GET',
        });

        if (res.ok) setTrends(await res.json());
        else throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load analytics trends', e);
        toastMaker(t('analytics_error_trends', { ns: 'common' }), 'error');
      } finally {
        setTrendsLoading(false);
      }
    };

    // Only fetch analytics when the authentication service reports a fully
    // authenticated user (has token + loaded user). This avoids noisy "Not
    // authenticated" errors when tokens exist but user profile isn't initialized.
    if (isAuth) {
      fetchOverview();
      fetchTrends();
    }
  }, [t, isAuth]);

  const maxValue = trends.length ? Math.max(...trends.map((p) => p.value)) : 0;

  const openDay = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSelectedDayLoading(true);
      setSelectedDayEvents([]);

      try {
        const res = await authenticationService.authenticatedFetch(
          `/api/analytics/events?date=${date}`,
          { method: 'GET' }
        );

        if (res.ok) {
          const data = (await res.json()) as AnalyticsEvent[];
          setSelectedDayEvents(data);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load analytics day events', e);
        toastMaker(t('analytics_error_day_events', { ns: 'common' }), 'error');
      } finally {
        setSelectedDayLoading(false);
      }
    },
    [t]
  );

  const refetchAnalytics = useCallback(async () => {
    setTrendsLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = authenticationService.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const [overviewRes, trendsRes] = await Promise.all([
        authenticationService.authenticatedFetch('/api/analytics/overview'),
        authenticationService.authenticatedFetch('/api/analytics/trends?days=7'),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (trendsRes.ok) setTrends(await trendsRes.json());
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to refresh analytics after edit', e);
      toastMaker(t('analytics_error_refresh', { ns: 'common' }), 'error');
    } finally {
      setTrendsLoading(false);
    }
  }, [t]);

  const closeDay = useCallback(() => {
    setSelectedDate(null);
    setSelectedDayEvents([]);
    setSelectedDayLoading(false);
  }, []);

  const openEditEvent = useCallback(
    async (event: CalendarEvent) => {
      try {
        const res = await authenticationService.authenticatedFetch(`/api/events/${event.id}`, {
          method: 'GET',
        });
        let detailedEvent = event;

        if (res.ok) {
          const payload = (await res.json()) as { event?: AnalyticsEventDetail };
          const source = payload.event;

          if (source) {
            detailedEvent = {
              id: source.id,
              date: source.startDate,
              title: source.title,
              description: source.description ?? '',
              eventType: source.eventType,
              ownerId: source.userId,
              createdAt: source.createdAt,
              updatedAt: source.updatedAt,
              colors: source.colors,
              startTime: source.startTime ?? undefined,
              endTime: source.endTime ?? undefined,
              location: source.location ?? undefined,
              countryCode: source.countryCode ?? undefined,
              reminderTime: source.reminderTime ?? undefined,
              isRecurring: source.isRecurring,
              isPublic: source.isPublic,
              completed: source.completed,
              priority: source.priority ?? undefined,
              participants: source.participants,
              metadata: source.metadata,
            } as CalendarEvent;
          }
        }

        closeDay();
        setEditError(null);
        setEditingEvent(detailedEvent);
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to load event for editing', e);
        toastMaker(t('analytics_error_load_event', { ns: 'common' }), 'error');
        closeDay();
        setEditError(null);
        setEditingEvent(event);
      }
    },
    [closeDay, t]
  );

  const closeEdit = useCallback(() => {
    setEditingEvent(null);
    setEditSaving(false);
    setEditError(null);
  }, []);

  const saveEdit = useCallback(
    async (task: CalendarEvent) => {
      if (editSaving) {
        return;
      }

      try {
        setEditSaving(true);
        setEditError(null);

        await updateCalendarEvent(task);

        closeEdit();
        await refetchAnalytics();
        await openDay(task.date);
      } catch (e) {
        if (import.meta.env.DEV) console.error('Failed to save analytics event edit', e);
        toastMaker(t('analytics_error_save_event', { ns: 'common' }), 'error');
        setEditError('Не вдалося зберегти зміни');
      } finally {
        setEditSaving(false);
      }
    },
    [closeEdit, editSaving, openDay, refetchAnalytics, t]
  );

  const modalTasks = useMemo<CalendarEvent[]>(
    () =>
      selectedDayEvents.map(
        (event) =>
          ({
            id: event.id,
            date: event.startDate,
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            ownerId: event.userId,
            createdAt: event.createdAt,
          }) as CalendarEvent
      ),
    [selectedDayEvents]
  );
  const todayDate = dayjs().format('YYYY-MM-DD');

  const exportCsv = async () => {
    try {
      const res = await authenticationService.authenticatedFetch('/api/analytics/export', {
        method: 'GET',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastMaker('Failed to export CSV', 'error');
      if (import.meta.env.DEV) console.error('CSV export failed', e);
    }
  };

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
        {!isAuth && (
          <div className={styles.authPrompt}>
            <p>
              {t('analytics_signin_prompt') || 'Пожалуйста, войдите чтобы просмотреть аналитику.'}
            </p>
            <button
              type="button"
              className={styles.signInButton}
              onClick={() => navigate('/signin')}
            >
              {t('sign_in') || 'Войти'}
            </button>
          </div>
        )}
        <section className={styles.chartCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>{t('weekly_rhythm')}</p>
              <h2 className={styles.sectionTitle}>{t('meeting_density_by_day')}</h2>
            </div>
          </div>

          <div className={styles.chartToolbar}>
            <span className={styles.sectionPill}>
              <span className={styles.liveDot} aria-hidden="true" />
              {t('live_snapshot')}
            </span>
            <button
              type="button"
              onClick={() => void exportCsv()}
              className={styles.sectionPillButton}
              title={t('export_csv')}
            >
              {t('export_csv')}
            </button>
          </div>

          <div className={styles.barChart}>
            {trendsLoading && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gridColumn: '1 / -1',
                  minHeight: '10rem',
                  width: '100%',
                }}
              >
                <DotLoader text={t('loading')} />
              </div>
            )}

            {!trendsLoading && trends.length === 0 && (
              <div className={`${styles.noData} ${styles.noDataAccent}`}>
                {t('no_data_week') !== 'no_data_week' ? t('no_data_week') : 'Нет данных за неделю'}
              </div>
            )}
            {trends.map((point) => {
              const height = maxValue ? Math.round((point.value / maxValue) * 100) : 0;
              const isToday = point.date === todayDate;
              const weekday = dayjs(point.date)
                .locale(i18n.language.startsWith('uk') ? 'uk' : 'en')
                .format('dd');
              const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
              const dateLabel = dayjs(point.date).format('DD.MM');
              return (
                <button
                  key={point.date}
                  type="button"
                  className={`${styles.barItem} ${isToday ? styles.barItemToday : ''}`}
                  onClick={() => openDay(point.date)}
                  aria-current={isToday ? 'date' : undefined}
                  title={`${label} ${dateLabel}: ${point.value}`}
                >
                  <div className={styles.barTrack} aria-hidden="true">
                    <div
                      className={`${styles.barFill} ${isToday ? styles.barFillToday : ''}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={styles.barLabel}>
                    <span className={styles.barLabelWeekday}>{label}</span>
                    <span className={styles.barLabelDate}>{dateLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <Suspense fallback={null}>
        {selectedDate && (
          <DayEventsModal
            isOpen={!!selectedDate}
            date={selectedDate}
            tasks={modalTasks}
            holidays={[]}
            isLoading={selectedDayLoading}
            onClose={closeDay}
            onEditTask={openEditEvent}
            otherDays={trends.map((point) => ({
              date: point.date,
              tasks: point.value,
              holidays: 0,
            }))}
            onSelectDay={(date) => openDay(date)}
          />
        )}
      </Suspense>

      <Modal isOpen={!!editingEvent} onClose={closeEdit}>
        {editingEvent && (
          <TaskInputForm
            initialTask={editingEvent}
            onSave={(task) => void saveEdit(task)}
            onCancel={closeEdit}
            isSubmitting={editSaving}
          />
        )}
      </Modal>
      {editError && <div className={styles.editError}>{editError}</div>}
    </NavigationPageShell>
  );
}
