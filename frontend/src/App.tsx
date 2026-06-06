import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';
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
import { selectIsLoggedIn, selectIsRefreshing, selectUserId } from './redux/user/selectors';
import { aiService } from './services/aiService';
import { useDispatch } from 'react-redux';
import { restoreSession } from './redux/user/operations';
import { persistor, type AppDispatch } from './redux/store';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getMyCalendarEvents,
  updateCalendarEvent,
} from './API/apiOperations';
import { Toaster } from 'react-hot-toast';
import './App.css';
import DotLoader from './components/DotLoader/DotLoader';

const syncInFlightOperations = new Set<string>();

function App() {
  const { t } = useTranslation();
  const [authChecked, setAuthChecked] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const [aiServiceStatus, setAiServiceStatus] = useState<{
    status: string;
    available: boolean;
    message?: string;
  } | null>(null);

  const [aiError, setAiError] = useState<string | null>(null);
  const isAuthenticated = useSelector(selectIsLoggedIn);
  const currentUserId = useSelector(selectUserId);
  const isAnalyticsRoute = location.pathname.startsWith('/analytics');

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
      JSON.stringify(leftCompleted) === JSON.stringify(rightCompleted) &&
      JSON.stringify(leftPriority) === JSON.stringify(rightPriority)
    );
  };

  const syncEventChanges = async (previousEvents: CalendarEvent[], nextEvents: CalendarEvent[]) => {
    const ownedPreviousEvents = previousEvents.filter((event) => event.ownerId === currentUserId);
    const ownedNextEvents = nextEvents.filter((event) => event.ownerId === currentUserId);

    const ownedPreviousById = new Map(ownedPreviousEvents.map((event) => [event.id, event]));
    const ownedNextById = new Map(ownedNextEvents.map((event) => [event.id, event]));

    const createdEvents = ownedNextEvents.filter((event) => !ownedPreviousById.has(event.id));
    const deletedEvents = ownedPreviousEvents.filter((event) => !ownedNextById.has(event.id));
    const updatedEvents = ownedNextEvents.filter((event) => {
      const previousEvent = ownedPreviousById.get(event.id);
      return previousEvent ? !eventsEqual(previousEvent, event) : false;
    });

    const uniqueOperation = (
      operation: 'create' | 'update' | 'delete',
      eventId: string,
      handler: () => Promise<unknown>
    ) => {
      const key = `${operation}:${eventId}`;

      if (syncInFlightOperations.has(key)) {
        return Promise.resolve();
      }

      syncInFlightOperations.add(key);

      return handler().finally(() => {
        syncInFlightOperations.delete(key);
      });
    };

    try {
      await Promise.all([
        ...createdEvents.map((event) =>
          uniqueOperation('create', event.id, () => createCalendarEvent(event))
        ),
        ...updatedEvents.map((event) =>
          uniqueOperation('update', event.id, () => updateCalendarEvent(event))
        ),
        ...deletedEvents.map((event) =>
          uniqueOperation('delete', event.id, () => deleteCalendarEvent(event.id))
        ),
      ]);
    } catch (error) {
      console.error('Failed to sync calendar events with backend:', error);
    }
  };

  const applyEventsUpdate = (updater: React.SetStateAction<CalendarEvent[]>) => {
    setEvents((previousEvents) => {
      const nextEvents = typeof updater === 'function' ? updater(previousEvents) : updater;
      void syncEventChanges(previousEvents, nextEvents);
      return nextEvents;
    });
  };

  // AI Service health check — run only after initial auth check completes
  useEffect(() => {
    if (!authChecked || !isAuthenticated || isAnalyticsRoute) return;

    const checkAIService = async () => {
      try {
        const health = await aiService.healthCheck();
        setAiServiceStatus(health);

        if (!health.available) {
          setAiError(`AI сервіс недоступний: ${health.message}`);
          console.warn('AI Service is not available:', health.message);
        } else {
          setAiError(null);
        }
      } catch (error) {
        console.error('Failed to check AI service health:', error);
        setAiServiceStatus({
          status: 'error',
          available: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        setAiError('Не вдалося перевірити доступність AI сервісу');
      }
    };

    // Check immediately and then every 5 minutes
    checkAIService();
    const interval = setInterval(checkAIService, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [authChecked, isAnalyticsRoute, isAuthenticated]);

  // Check AI service on authentication change
  useEffect(() => {
    if (isAuthenticated && !isAnalyticsRoute) {
      const checkAIOnAuth = async () => {
        const health = await aiService.healthCheck();
        setAiServiceStatus(health);
        if (!health.available) {
          setAiError('AI асистент тимчасово недоступний. Спробуйте пізніше.');
        }
      };
      checkAIOnAuth();
    }
  }, [isAnalyticsRoute, isAuthenticated]);

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

  // Notification component for AI service status
  const AIServiceNotification = () => {
    if (isAnalyticsRoute) {
      return null;
    }

    if (!aiError && (!aiServiceStatus || aiServiceStatus.available)) {
      return null;
    }
    return (
      <div className="ai-service-notification">
        <div className="notification-content">
          <span className="notification-icon">🤖</span>
          <div className="notification-text">
            {aiError || 'AI асистент недоступний'}
            {aiServiceStatus?.message && (
              <small className="notification-detail">{aiServiceStatus.message}</small>
            )}
          </div>
        </div>
      </div>
    );
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
          style: {
            background: 'color-mix(in srgb, var(--surface-panel-start) 92%, transparent)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid color-mix(in srgb, var(--color-text-primary) 6%, transparent)',
            padding: '0.5rem 0.75rem',
            fontWeight: '500',
            width: 'auto',
            whiteSpace: 'nowrap',
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
      {isAuthenticated && !isAnalyticsRoute && <AIServiceNotification />}
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
                <HomePage events={events} setEvents={applyEventsUpdate} />
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
