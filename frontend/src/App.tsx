import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import WelcomeSection from "./components/WelcomeSection/WelcomeSection.jsx";
import SignUpPage from "./pages/SignUpPage/SignUpPage.jsx";
import SignInPage from "./pages/SignInPage/SignInPage.jsx";
import HomePage from "./pages/HomePage/HomePage.jsx"; // main calendar page
import { authenticationService } from "./services/authService";
import { AIAssistant } from "./components/AIAssistant/AIAssistant";
import type { CalendarEvent } from "./services/aiService";

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = authenticationService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Public Route wrapper (redirect to calendar if already authenticated)
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = authenticationService.isAuthenticated();

  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    authenticationService.isAuthenticated()
  );

  // Listen for authentication changes
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(authenticationService.isAuthenticated());
    };

    // Check auth status periodically
    const interval = setInterval(checkAuth, 5000);

    return () => clearInterval(interval);
  }, []);

  // Event handlers for AI Assistant
  const handleEventCreate = (event: CalendarEvent) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`,
    };
    setEvents((prev) => [...prev, newEvent]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event
      )
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <WelcomeSection />
            </PublicRoute>
          }
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

        {/* Protected routes */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <HomePage events={events} setEvents={setEvents} />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* AI Assistant - only show when authenticated */}
      {isAuthenticated && (
        <AIAssistant
          currentEvents={events}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
        />
      )}
    </>
  );
}

export default App;
