import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import WelcomeSection from './components/WelcomeSection/WelcomeSection';
import SignUpPage from './pages/SignUpPage/SignUpPage';
import SignInPage from './pages/SignInPage/SignInPage';
import HomePage from './pages/HomePage/HomePage'; // main calendar page
import { authenticationService } from './services/authService';
import { AIAssistant } from './components/AIAssistant/AIAssistant';

import type { CalendarEvent } from './types/types';
import './App.css';

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = authenticationService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Public Route wrapper
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const isAuthenticated = authenticationService.isAuthenticated();

  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(authenticationService.isAuthenticated());

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(authenticationService.isAuthenticated());
    };

    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEventCreate = (event: CalendarEvent) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`,
    };
    setEvents((prev) => [...prev, newEvent]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event))
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  return (
    <div className="app">
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/calendar" replace /> : <WelcomeSection />}
        />

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

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <HomePage events={events} setEvents={setEvents} />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            isAuthenticated ? <Navigate to="/calendar" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>

      {isAuthenticated && (
        <AIAssistant
          currentEvents={events}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
        />
      )}
    </div>
  );
}

export default App;
