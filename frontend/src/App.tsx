import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import WelcomeSection from './components/WelcomeSection/WelcomeSection';
import SignUpPage from './pages/SignUpPage/SignUpPage';
import SignInPage from './pages/SignInPage/SignInPage';
import AuthSuccessPage from './pages/AuthSuccessPage/AuthSuccessPage';
import VerificationPage from './pages/VerificationPage/VerificationPage';
const VerificationSuccessPage = React.lazy(
  () => import('./pages/VerificationSuccessPage/VerificationSuccessPage')
);
const VerificationFailedPage = React.lazy(
  () => import('./pages/VerificationFailedPage/VerificationFailedPage')
);
import HomePage from './pages/HomePage/HomePage'; // main calendar page
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage/AnalyticsPage'));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage/ContactsPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage/NotificationsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage/SettingsPage'));
import { useTranslation } from 'react-i18next';
const AIAssistantDrawer = React.lazy(() =>
  import('./components/AIAssistant/AIAssistantDrawer').then((m) => ({
    default: m.AIAssistantDrawer,
  }))
);
import { Layout } from './components/Layout/Layout';
import type { CalendarEvent } from './types/calendar.types';
import { useSelector } from 'react-redux';
import {
  selectIsLoggedIn,
  selectIsRefreshing,
  selectSessionRestored,
  selectUserId,
  selectUser,
} from './redux/user/selectors';
import { aiService } from './services/aiService';
import { useDensity } from './hooks/useDensity';
import { useDispatch } from 'react-redux';
import { restoreSession } from './redux/user/operations';
import { setUserCity } from './redux/user/userSlice';
import { persistor, type AppDispatch } from './redux/store';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarShares,
  getMyCalendarEvents,
  respondToInvitation,
  updateCalendarEvent,
} from './API/apiOperations';
import instance from './API/axiosInstance';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import DotLoader from './components/DotLoader/DotLoader';

const syncInFlightOperations = new Set<string>();

function App() {
  const { t, i18n } = useTranslation();
  const [authChecked, setAuthChecked] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const [aiServiceStatus, setAiServiceStatus] = useState<{
    status: string;
    available: boolean;
    message?: string;
  } | null>(null);

  const isAuthenticated = useSelector(selectIsLoggedIn);
  const sessionRestored = useSelector(selectSessionRestored);
  const currentUserId = useSelector(selectUserId);
  const user = useSelector(selectUser);
  const isAnalyticsRoute = location.pathname.startsWith('/analytics');

  // Apply the user's compactDensity preference to <html> (see useDensity).
  useDensity();

  // Calendars shared with the current user; the write-permission ones are
  // offered as targets in the event-creation form (see TaskInputForm).
  const { data: calendarSharesData } = useQuery({
    queryKey: ['calendarShares'],
    queryFn: getCalendarShares,
    // Only while signed in: a root-level query has no route guard, so without
    // this it keeps refetching on /signin after logout (see Header pattern).
    enabled: isAuthenticated && sessionRestored,
  });

  const writableSharedCalendars = (calendarSharesData?.sharedWithMe ?? [])
    .filter((share) => share.permission === 'write')
    .map((share) => ({ ownerId: share.ownerId, ownerName: share.ownerName ?? '' }));

  // Keep i18n in sync with the authoritative language preference: the logged-in
  // user's saved language when available, otherwise the persisted localStorage
  // value. Runs on boot and whenever the backend user language loads/changes,
  // so the UI never lags behind the stored preference.
  useEffect(() => {
    const preferred = user?.language || localStorage.getItem('language');
    if (preferred && !i18n.language.startsWith(preferred)) {
      i18n.changeLanguage(preferred);
      localStorage.setItem('language', preferred);
    }
  }, [user?.language, i18n]);

  // Detect the user's city once on mount via IP geolocation and store it for weather-aware AI answers, silently ignore any failure.
  useEffect(() => {
    instance
      .get('/api/ai/location')
      .then(({ data }) => {
        if (data?.city) dispatch(setUserCity(data.city));
      })
      .catch(() => {
        // Ignore: city detection is optional.
      });
  }, [dispatch]);

  // Protected Route wrapper - redirect to /signin if not authenticated, but wait for auth check to complete first
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const authed = useSelector(selectIsLoggedIn);
    const refreshing = useSelector(selectIsRefreshing);

    // while we are checking auth status, don't redirect (avoid flashing to /signin)
    if (!authChecked || refreshing) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <DotLoader text={t('verifying_session')} />
        </div>
      );
    }
    // only after authChecked === true
    if (!authed) {
      return <Navigate to="/signin" replace />;
    }

    return <>{children}</>;
  };

  // Public Route wrapper — avoid redirecting authenticated users before authChecked
  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const authed = useSelector(selectIsLoggedIn);

    // waiting to complete cheking auth status
    if (!authChecked) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <DotLoader text={t('verifying_session')} />
        </div>
      );
    }

    if (authed) {
      return <Navigate to="/calendar" replace />;
    }

    return <>{children}</>;
  };

  const eventsEqual = (left: CalendarEvent, right: CalendarEvent) => {
    const leftParticipants = 'participants' in left ? left.participants : undefined;
    const rightParticipants = 'participants' in right ? right.participants : undefined;

    const leftReminderTime = 'reminderTime' in left ? left.reminderTime : null;
    const rightReminderTime = 'reminderTime' in right ? right.reminderTime : null;

    const leftIsRecurring = 'isRecurring' in left ? left.isRecurring : null;
    const rightIsRecurring = 'isRecurring' in right ? right.isRecurring : null;

    const leftCompleted = 'completed' in left ? left.completed : null;
    const rightCompleted = 'completed' in right ? right.completed : null;

    const leftPriority = 'priority' in left ? left.priority : null;
    const rightPriority = 'priority' in right ? right.priority : null;

    return (
      left.id === right.id &&
      left.date === right.date &&
      left.title === right.title &&
      left.eventType === right.eventType &&
      left.description === right.description &&
      left.startTime === right.startTime &&
      left.endTime === right.endTime &&
      left.location === right.location &&
      left.countryCode === right.countryCode &&
      JSON.stringify(left.colors || []) === JSON.stringify(right.colors || []) &&
      JSON.stringify(leftParticipants || []) === JSON.stringify(rightParticipants || []) &&
      JSON.stringify(leftReminderTime) === JSON.stringify(rightReminderTime) &&
      JSON.stringify(leftIsRecurring) === JSON.stringify(rightIsRecurring) &&
      (left.isPrivate ?? false) === (right.isPrivate ?? false) &&
      JSON.stringify(leftCompleted) === JSON.stringify(rightCompleted) &&
      JSON.stringify(leftPriority) === JSON.stringify(rightPriority)
    );
  };

  // Eligibility to persist from the client: events the user owns, not-yet-saved
  // local events (no ownerId), and events on a calendar shared with write
  // permission. Read-only shares and holidays are never written back. This gate
  // is intentionally separate from the new-vs-existing decision below.
  const canPersistEvent = (event: CalendarEvent) =>
    !event.ownerId ||
    event.ownerId === currentUserId ||
    (event.accessRole === 'shared' && event.sharePermission === 'write');

  const syncEventChanges = async (previousEvents: CalendarEvent[], nextEvents: CalendarEvent[]) => {
    // Identity (existing vs new) is decided purely by id across the full
    // snapshots, never by ownership: an id present before is an existing event
    // (PUT), a brand-new id is a creation (POST). This keeps an edited
    // write-shared event — whose ownerId belongs to its owner, not the current
    // user — correctly routed to update instead of misclassified as a creation.
    const previousById = new Map(previousEvents.map((event) => [event.id, event]));
    const nextById = new Map(nextEvents.map((event) => [event.id, event]));

    const persistablePrevious = previousEvents.filter(canPersistEvent);
    const persistableNext = nextEvents.filter(canPersistEvent);

    const createdEvents = persistableNext.filter((event) => !previousById.has(event.id));
    const deletedEvents = persistablePrevious.filter((event) => !nextById.has(event.id));
    const updatedEvents = persistableNext.filter((event) => {
      const previousEvent = previousById.get(event.id);
      return previousEvent ? !eventsEqual(previousEvent, event) : false;
    });

    const uniqueOperation = <T,>(
      operation: 'create' | 'update' | 'delete',
      eventId: string,
      handler: () => Promise<T>
    ): Promise<T | undefined> => {
      const key = `${operation}:${eventId}`;

      if (syncInFlightOperations.has(key)) {
        return Promise.resolve(undefined);
      }

      syncInFlightOperations.add(key);

      return handler().finally(() => {
        syncInFlightOperations.delete(key);
      });
    };

    try {
      const [createdResults] = await Promise.all([
        Promise.all(
          createdEvents.map((event) =>
            uniqueOperation('create', event.id, () => createCalendarEvent(event))
          )
        ),
        Promise.all(
          updatedEvents.map((event) =>
            uniqueOperation('update', event.id, () => updateCalendarEvent(event))
          )
        ),
        Promise.all(
          deletedEvents.map((event) =>
            uniqueOperation('delete', event.id, () => deleteCalendarEvent(event.id))
          )
        ),
      ]);

      // Reconcile locally-created events with their persisted versions: the
      // backend assigns the canonical id (uuid) and ownerId, so adopt them to
      // keep subsequent updates/deletes addressable.
      const persistedByTempId = new Map<string, CalendarEvent>();
      createdEvents.forEach((tempEvent, index) => {
        const persisted = createdResults[index];
        if (persisted) {
          persistedByTempId.set(tempEvent.id, persisted);
        }
      });

      if (persistedByTempId.size > 0) {
        setEvents((current) => current.map((event) => persistedByTempId.get(event.id) ?? event));
      }
    } catch (error) {
      console.error('Failed to sync calendar events with backend:', error);
    }
  };

  // Decline/leave a participant invitation. This is a direct call to the
  // invitation endpoint — deliberately NOT routed through syncEventChanges,
  // since participant events are (correctly) excluded from the events diff.
  // On success we drop the card from local state via the raw setter, bypassing
  // the diff entirely.
  const handleLeaveInvitation = async (participationId: string) => {
    try {
      await respondToInvitation(participationId, 'declined');
      setEvents((prev) => prev.filter((event) => event.participationId !== participationId));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      toast.error(t('failed_to_respond', { ns: 'navigation' }));
    }
  };

  const applyEventsUpdate = (updater: React.SetStateAction<CalendarEvent[]>) => {
    setEvents((previousEvents) => {
      const nextEvents = typeof updater === 'function' ? updater(previousEvents) : updater;
      void syncEventChanges(previousEvents, nextEvents);
      return nextEvents;
    });
  };

  // AI Service health check
  useEffect(() => {
    // ! run only after initial auth check completes !
    if (!authChecked || !isAuthenticated || isAnalyticsRoute) return;

    const checkAIService = async () => {
      try {
        const health = await aiService.healthCheck();
        setAiServiceStatus(health);

        if (!health.available) {
          // Show only once per session — don't alarm the user on every check
          if (!sessionStorage.getItem('ai-status-shown')) {
            sessionStorage.setItem('ai-status-shown', '1');
            toast.error('AI асистент тимчасово недоступний', {
              id: 'ai-service-error',
              duration: 3000,
            });
          }
          console.warn('AI Service is not available:', health.message);
        }
      } catch (error) {
        console.error('Failed to check AI service health:', error);
        setAiServiceStatus({
          status: 'error',
          available: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        // Show only once per session — don't alarm the user on every check
        if (!sessionStorage.getItem('ai-status-shown')) {
          sessionStorage.setItem('ai-status-shown', '1');
          toast.error('Не вдалося перевірити доступність AI сервісу', {
            id: 'ai-service-error',
            duration: 3000,
          });
        }
      }
    };

    // Check immediately and then every 5 minutes
    checkAIService();
    const interval = setInterval(checkAIService, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [authChecked, isAnalyticsRoute, isAuthenticated]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!authChecked) return;

      if (!isAuthenticated) {
        setEvents([]);
        return;
      }

      try {
        const loadedEvents = await getMyCalendarEvents();
        setEvents(loadedEvents);
      } catch (error) {
        console.error('Failed to load calendar events:', error);
      }
    };

    void loadEvents();
  }, [isAuthenticated, authChecked, currentUserId]);

  // Restore session after redux-persist rehydration completes
  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        await dispatch(restoreSession()).unwrap();
      } catch {
        // restoreSession handles auth cleanup internally
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    };

    const startBootstrap = () => {
      if (cancelled) return;
      void bootstrapAuth();
    };

    if (persistor.getState().bootstrapped) {
      startBootstrap();
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        unsubscribe();
        startBootstrap();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [dispatch]);

  // Handlers for AI Assistant events
  const handleEventCreate = (event: CalendarEvent) => {
    applyEventsUpdate((prev) => [...prev, event]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    applyEventsUpdate((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event))
    );
  };

  // Handler for deleting an event
  const handleEventDelete = (eventId: string) => {
    applyEventsUpdate((prev) => prev.filter((event) => event.id !== eventId));
  };

  return (
    <div className="app-container">
      {/* Single global Toaster — works on all routes including auth pages */}
      <Toaster
        position="top-center"
        gutter={10}
        reverseOrder={false}
        toastOptions={{
          duration: 1500,
          removeDelay: 0,
          // Glass card styling to match the app's design system
          style: {
            borderRadius: '1rem',
            padding: '0.65rem 1rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'var(--surface-panel-start)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--surface-panel-border)',
            boxShadow: '0 8px 24px var(--surface-panel-shadow)',
            width: 'auto',
            whiteSpace: 'nowrap',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-accent)',
              secondary: 'var(--color-text-primary)',
            },
          },
          error: {
            duration: 3000,
            iconTheme: {
              primary: '#e05c5c',
              secondary: 'var(--color-text-primary)',
            },
          },
        }}
        containerStyle={{
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
          width: 'auto',
        }}
      />
      <Routes>
        {/* Home route with conditional rendering */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/calendar" replace />
            ) : (
              <Layout>
                <WelcomeSection />
              </Layout>
            )
          }
        />

        {/* Authentication routes — rendered without Layout; AuthPageShell provides its own full-page shell */}
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />

        <Route
          path="/signin"
          element={
            <PublicRoute>
              <SignInPage />
            </PublicRoute>
          }
        />

        <Route path="/auth/success" element={<AuthSuccessPage />} />

        <Route path="/verify-email" element={<VerificationPage />} />

        <Route
          path="/verification-success"
          element={
            <Suspense fallback={null}>
              <VerificationSuccessPage />
            </Suspense>
          }
        />

        <Route
          path="/verification-failed"
          element={
            <Suspense fallback={null}>
              <VerificationFailedPage />
            </Suspense>
          }
        />

        {/* Main calendar route - protected */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Layout>
                <HomePage
                  events={events}
                  setEvents={applyEventsUpdate}
                  writableSharedCalendars={writableSharedCalendars}
                  onLeaveInvitation={handleLeaveInvitation}
                />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={null}>
                  <AnalyticsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* preview route removed */}

        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={null}>
                  <ContactsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={null}>
                  <NotificationsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={null}>
                  <SettingsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback route - redirect to appropriate page */}
        <Route
          path="*"
          element={
            isAuthenticated ? <Navigate to="/calendar" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>

      {/* AI Assistant - show for authenticated users and let the drawer handle availability */}
      {isAuthenticated && (
        <Suspense fallback={null}>
          <AIAssistantDrawer
            currentEvents={events}
            onEventCreate={handleEventCreate}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            isServiceAvailable={aiServiceStatus?.available ?? false}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
