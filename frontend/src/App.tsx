import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import WelcomeSection from './components/WelcomeSection/WelcomeSection';
import SignUpPage from './pages/SignUpPage/SignUpPage';
import SignInPage from './pages/SignInPage/SignInPage';
import HomePage from './pages/HomePage/HomePage'; // main calendar page
// import { authenticationService } from './services/authService';
import { AIAssistant } from './components/AIAssistant/AIAssistant';
import { Layout } from './components/Layout/Layout';
import type { CalendarEvent } from './types/types';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn } from './redux/user/selectors';
import { aiService } from './services/aiService';
import './App.css';

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

  // AI Service health check
  useEffect(() => {
    const checkAIService = async () => {
      try {
        console.log('Checking AI service health...');
        const health = await aiService.healthCheck();
        console.log('AI Service Health:', health);
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

  // Handlers for AI Assistant events
  const handleEventCreate = (event: CalendarEvent) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setEvents((prev) => [...prev, newEvent]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event))
    );
  };

  // Handler for deleting an event
  const handleEventDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
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

        {/* Main calendar route - protected */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Layout>
                <HomePage events={events} setEvents={setEvents} />
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

      {/* AI Assistant - only show when user is authenticated */}
      {isAuthenticated && aiServiceStatus?.available && (
        <AIAssistant
          currentEvents={events}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
          isServiceAvailable={aiServiceStatus.available}
        />
      )}
    </div>
  );
}

export default App;
