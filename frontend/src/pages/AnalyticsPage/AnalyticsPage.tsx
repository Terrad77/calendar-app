import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './AnalyticsPage.module.css';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { authenticationService } from '../../services/authService';
import { selectIsLoggedIn } from '../../redux/user/selectors';
import dayjs from 'dayjs';
import type { CalendarEvent } from '../../types/calendar.types';
import Modal from '../../components/Modal/Modal';
import DotLoader from '../../components/DotLoader/DotLoader';
import { TaskInputForm } from '../../components/Calendar/TaskInputFormComponent/TaskInputFormComponent';
import { updateCalendarEvent } from '../../API/apiOperations';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { MonthPulseChart } from '../../components/MonthPulseChart/MonthPulseChart';
import type { MonthPulsePoint } from '../../components/MonthPulseChart/MonthPulseChart';

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

// Locked placeholder shown inside auth-gated analytics cards when the user is
// not signed in — keeps the grid consistent without infinite spinners.
function LockedAnalyticsBody() {
  const { t } = useTranslation('navigation');
  const navigate = useNavigate();

  return (
    <div className={styles.lockedCard}>
      <Lock className={styles.lockIcon} size={32} strokeWidth={1.5} aria-hidden="true" />
      <p className={styles.lockText}>
        {t('analytics_signin_prompt') || 'Увійдіть, щоб переглянути аналітику'}
      </p>
      <button type="button" className={styles.signInButton} onClick={() => navigate('/signin')}>
        {t('sign_in') || 'Увійти'}
      </button>
    </div>
  );
}

// Empty-state block shown inside an analytics card when there is no event data
// yet — gives a friendly message and a CTA back to the calendar.
function AnalyticsEmptyState() {
  const { t } = useTranslation('analytics');

  return (
    <div className={styles.emptyState}>
      <CalendarDays className={styles.emptyIcon} size={32} strokeWidth={1.5} aria-hidden="true" />
      <p className={styles.emptyTitle}>{t('noDataTitle')}</p>
      <p className={styles.emptyHint}>{t('noDataHint')}</p>
      <Link to="/calendar" className={styles.emptyAction}>
        {t('createEvent')}
      </Link>
    </div>
  );
}

export default function AnalyticsPage() {
  const { t, i18n } = useTranslation('navigation');
  const [overview, setOverview] = useState<{
    activeEvents: number;
    avgPerDay: number;
    recurringRate: number;
  } | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [monthPulse, setMonthPulse] = useState<MonthPulsePoint[]>([]);
  const [monthPulseLoading, setMonthPulseLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<AnalyticsEvent[]>([]);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Timeout/error state for the initial analytics load: a cold backend (Render
  // free tier ~30s spin-up) would otherwise spin forever. retryCount lets the
  // user re-trigger the fetch effect on demand.
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // AI-generated insights for the "Weekly pattern" panel.
  const [insights, setInsights] = useState<{ insights: string[]; hasData: boolean } | null>(null);
  // Derive auth state from the reactive Redux store (single source of truth),
  // not the imperative singleton — the latter could read a stale/cleared token
  // and wrongly show the sign-in prompt for an authenticated user.
  const isAuth = useSelector(selectIsLoggedIn);

  useEffect(() => {
    // Only fetch analytics when the user is authenticated. This avoids noisy
    // "Not authenticated" errors when tokens exist but the profile isn't ready.
    if (!isAuth) return;

    // One controller covers all three calls; abort after a fixed budget so a
    // cold backend surfaces a retryable error instead of an infinite spinner.
    const controller = new AbortController();
    const { signal } = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);

    setError(null);

    const fetchOverview = async () => {
      const res = await authenticationService.authenticatedFetch('/api/analytics/overview', {
        method: 'GET',
        signal,
      });
      if (res.ok) setOverview(await res.json());
      else throw new Error(`HTTP ${res.status}`);
    };

    const fetchTrends = async () => {
      setTrendsLoading(true);
      try {
        const res = await authenticationService.authenticatedFetch('/api/analytics/trends?days=7', {
          method: 'GET',
          signal,
        });
        if (res.ok) setTrends(await res.json());
        else throw new Error(`HTTP ${res.status}`);
      } finally {
        setTrendsLoading(false);
      }
    };

    const fetchMonthPulse = async () => {
      setMonthPulseLoading(true);
      try {
        const res = await authenticationService.authenticatedFetch('/api/analytics/month-pulse', {
          method: 'GET',
          signal,
        });
        if (res.ok) setMonthPulse(await res.json());
        else throw new Error(`HTTP ${res.status}`);
      } finally {
        setMonthPulseLoading(false);
      }
    };

    const run = async () => {
      try {
        await Promise.all([fetchOverview(), fetchTrends(), fetchMonthPulse()]);
      } catch (e) {
        // Only the timeout sets the retryable error; an abort from cleanup
        // (unmount or retry) must not flash an error on the way out.
        if (e instanceof DOMException && e.name === 'AbortError') {
          if (timedOut) setError('server_timeout');
        } else {
          if (import.meta.env.DEV) console.error('Failed to load analytics', e);
          toastMaker(t('analytics_error_trends', { ns: 'common' }), 'error');
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void run();

    // Cleanup: abort in-flight requests and clear the timer on unmount or when
    // isAuth/retryCount changes (prevents leaks and stale state updates).
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
    // `t` is excluded: with useSuspense:false, react-i18next can return a new
    // `t` identity on re-render, which would re-run this effect on every state
    // update and cause a fetch loop. retryCount is a plain number that only
    // changes on an explicit Retry click, so adding it to the deps is safe and
    // does not reintroduce that loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, retryCount]);

  // AI insights load independently of the chart timeout above, so a slow Gemini
  // call never blocks or errors the charts.
  useEffect(() => {
    if (!isAuth) {
      setInsights(null);
      return;
    }

    const controller = new AbortController();
    const loadInsights = async () => {
      try {
        const res = await authenticationService.authenticatedFetch('/api/ai/insights', {
          method: 'GET',
          signal: controller.signal,
        });
        if (res.ok) {
          setInsights((await res.json()) as { insights: string[]; hasData: boolean });
        }
      } catch {
        // Best-effort: insights failures must not affect the rest of the page.
      }
    };

    void loadInsights();

    return () => controller.abort();
  }, [isAuth, retryCount]);

  const maxValue = trends.length ? Math.max(...trends.map((p) => p.value)) : 0;
  // Minimum bar height (%) so 0-count days stay visible instead of collapsing.
  const MIN_BAR_HEIGHT_PCT = 6;
  // Month card is empty once loaded if there are no points or every day is zero
  // (mirrors the empty check inside MonthPulseChart).
  const monthHasNoData =
    !monthPulseLoading && (monthPulse.length === 0 || monthPulse.every((p) => p.value === 0));

  // The "Weekly pattern" panel now reflects AI insights instead of static copy.
  let insightTitle = t('weekly_pattern');
  let insightItems: string[];
  if (insights === null) {
    insightItems = isAuth ? [t('loading')] : [t('noInsightsHint', { ns: 'analytics' })];
  } else if (insights.hasData && insights.insights.length > 0) {
    insightItems = insights.insights;
  } else {
    insightTitle = t('noInsightsTitle', { ns: 'analytics' });
    insightItems = [t('noInsightsHint', { ns: 'analytics' })];
  }

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
  const currentMonthLabel = dayjs().format('MMMM YYYY');

  const exportCsv = async () => {
    try {
      // The export endpoint requires a `date` query param (YYYY-MM-DD); export today's events.
      const res = await authenticationService.authenticatedFetch(
        `/api/analytics/export?date=${todayDate}`,
        { method: 'GET' }
      );
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
          title: insightTitle,
          items: insightItems,
        },
      ]}
    >
      {error ? (
        <div className={styles.errorState}>
          <p>{t('serverTimeout', { ns: 'analytics' })}</p>
          <button
            type="button"
            className={styles.signInButton}
            onClick={() => {
              setError(null);
              setRetryCount((count) => count + 1);
            }}
          >
            {t('retry', { ns: 'analytics' })}
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.chartCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>{t('weekly_rhythm')}</p>
                <h2 className={styles.sectionTitle}>{t('meeting_density_by_day')}</h2>
              </div>
            </div>

            {isAuth ? (
              <>
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

                  {!trendsLoading && trends.length === 0 && <AnalyticsEmptyState />}
                  {trends.map((point) => {
                    // Clamp the denominator to avoid divide-by-zero on an empty
                    // week; floor every bar so 0-count days remain visible.
                    const height =
                      point.value === 0
                        ? MIN_BAR_HEIGHT_PCT
                        : Math.max(
                            MIN_BAR_HEIGHT_PCT,
                            Math.round((point.value / Math.max(maxValue, 1)) * 100)
                          );
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
              </>
            ) : (
              <LockedAnalyticsBody />
            )}
          </section>

          <section className={styles.chartCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>{t('month_pulse_label')}</p>
                <h2 className={styles.sectionTitle}>{t('month_pulse_title')}</h2>
              </div>
            </div>

            {isAuth ? (
              monthHasNoData ? (
                <AnalyticsEmptyState />
              ) : (
                <MonthPulseChart
                  data={monthPulse}
                  loading={monthPulseLoading}
                  month={currentMonthLabel}
                  noDataText={t('no_data_month', {
                    ns: 'common',
                    defaultValue: 'No data for the month',
                  })}
                  loadingText={t('loading')}
                />
              )
            ) : (
              <LockedAnalyticsBody />
            )}
          </section>
        </div>
      )}

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
