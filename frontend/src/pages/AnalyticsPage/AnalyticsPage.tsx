import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './AnalyticsPage.module.css';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { authenticationService } from '../../services/authService';
import dayjs from 'dayjs';
import type { CalendarEvent } from '../../types/types';
import Modal from '../../components/Modal/Modal';
import DotLoader from '../../components/DotLoader/DotLoader';
import { TaskInputForm } from '../../components/Calendar/TaskInputFormComponent/TaskInputFormComponent';
import { updateCalendarEvent } from '../../API/apiOperations';

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
  const API = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const headers: Record<string, string> = {};
        const token = authenticationService.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API}/api/analytics/overview`, { headers });
        if (res.ok) setOverview(await res.json());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load analytics overview', e);
      }
    };

    const fetchTrends = async () => {
      setTrendsLoading(true);
      try {
        const headers: Record<string, string> = {};
        const token = authenticationService.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API}/api/analytics/trends?days=7`, { headers });
        if (res.ok) setTrends(await res.json());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load analytics trends', e);
      } finally {
        setTrendsLoading(false);
      }
    };

    fetchOverview();
    fetchTrends();
  }, [API]);

  const maxValue = trends.length ? Math.max(...trends.map((p) => p.value)) : 0;

  const openDay = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSelectedDayLoading(true);
      setSelectedDayEvents([]);

      try {
        const headers: Record<string, string> = {};
        const token = authenticationService.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API}/api/analytics/events?date=${date}`, { headers });
        if (res.ok) {
          const data = (await res.json()) as AnalyticsEvent[];
          setSelectedDayEvents(data);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load analytics day events', e);
      } finally {
        setSelectedDayLoading(false);
      }
    },
    [API]
  );

  const refetchAnalytics = useCallback(async () => {
    setTrendsLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = authenticationService.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const [overviewRes, trendsRes] = await Promise.all([
        fetch(`${API}/api/analytics/overview`, { headers }),
        fetch(`${API}/api/analytics/trends?days=7`, { headers }),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (trendsRes.ok) setTrends(await trendsRes.json());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh analytics after edit', e);
    } finally {
      setTrendsLoading(false);
    }
  }, [API]);

  const closeDay = useCallback(() => {
    setSelectedDate(null);
    setSelectedDayEvents([]);
    setSelectedDayLoading(false);
  }, []);

  const openEditEvent = useCallback(
    async (event: CalendarEvent) => {
      try {
        const headers: Record<string, string> = {};
        const token = authenticationService.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API}/api/events/${event.id}`, { headers });
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
        // eslint-disable-next-line no-console
        console.error('Failed to load event for editing', e);
        closeDay();
        setEditError(null);
        setEditingEvent(event);
      }
    },
    [API, closeDay]
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
        // eslint-disable-next-line no-console
        console.error('Failed to save analytics event edit', e);
        setEditError('Не вдалося зберегти зміни');
      } finally {
        setEditSaving(false);
      }
    },
    [closeEdit, editSaving, openDay, refetchAnalytics]
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
  // Production: no dev preview flags
  const previewVariant = (urlParams.get('variant') || 'A').toUpperCase();
  const variantClass =
    previewVariant === 'B'
      ? styles.noDataStrong
      : previewVariant === 'C'
        ? styles.noDataAccent
        : styles.noDataSubtle;

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
            {trendsLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
