import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';
import WelcomeSection from './components/WelcomeSection/WelcomeSection';
import SignUpPage from './pages/SignUpPage/SignUpPage';
import SignInPage from './pages/SignInPage/SignInPage';
import AuthSuccessPage from './pages/AuthSuccessPage/AuthSuccessPage';
import HomePage from './pages/HomePage/HomePage'; // main calendar page
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage/AnalyticsPage'));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage/ContactsPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage/NotificationsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage/SettingsPage'));
// import { authenticationService } from './services/authService';
const AIAssistantDrawer = React.lazy(() =>
  import('./components/AIAssistant/AIAssistantDrawer').then((m) => ({
    default: m.AIAssistantDrawer,
  }))
);
import { Layout } from './components/Layout/Layout';
import type { CalendarEvent } from './types/types';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from './redux/user/selectors';
import { aiService } from './services/aiService';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from './API/apiOperations';
import './App.css';

const syncInFlightOperations = new Set<string>();

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useSelector(selectIsLoggedIn);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

interface PublicRouteProps {
  children: React.ReactNode;
}

// Public Route wrapper - redirects authenticated users to calendar
const PublicRoute = ({ children }: PublicRouteProps) => {
  const isAuthenticated = useSelector(selectIsLoggedIn);

  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [aiServiceStatus, setAiServiceStatus] = useState<{
    status: string;
    available: boolean;
    message?: string;
  } | null>(null);

  const [aiError, setAiError] = useState<string | null>(null);
  const isAuthenticated = useSelector(selectIsLoggedIn);

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
    const previousById = new Map(previousEvents.map((event) => [event.id, event]));
    const nextById = new Map(nextEvents.map((event) => [event.id, event]));

    const createdEvents = nextEvents.filter((event) => !previousById.has(event.id));
    const deletedEvents = previousEvents.filter((event) => !nextById.has(event.id));
    const updatedEvents = nextEvents.filter((event) => {
      const previousEvent = previousById.get(event.id);
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

  // AI Service health check
  useEffect(() => {
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
  }, []);

  // Check AI service on authentication change
  useEffect(() => {
    if (isAuthenticated) {
      const checkAIOnAuth = async () => {
        const health = await aiService.healthCheck();
        setAiServiceStatus(health);
        if (!health.available) {
          setAiError('AI асистент тимчасово недоступний. Спробуйте пізніше.');
        }
      };
      checkAIOnAuth();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!isAuthenticated) {
        setEvents([]);
        return;
      }

      try {
        const loadedEvents = await getCalendarEvents();
        setEvents(loadedEvents);
      } catch (error) {
        console.error('Failed to load calendar events:', error);
      }
    };

    void loadEvents();
  }, [isAuthenticated]);

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
      <AIServiceNotification />
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

        {/* Authentication routes */}
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Layout>
                <SignUpPage />
              </Layout>
            </PublicRoute>
          }
        />

        <Route
          path="/signin"
          element={
            <PublicRoute>
              <Layout>
                <SignInPage />
              </Layout>
            </PublicRoute>
          }
        />

        <Route path="/auth/success" element={<AuthSuccessPage />} />

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
