import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';
import { store, persistor } from './redux/store';
import { ThemeProvider } from './contexts/ThemeContext';
import './locales';

// Initialize Sentry dynamically only when DSN is provided. This keeps
// local development and pre-commit hooks working when @sentry/* packages
// are not installed (they are optional dev-deps for release builds).
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  void (async () => {
    try {
      // @ts-ignore optional dependency
      const Sentry: any = await import('@sentry/react');
      // @ts-ignore optional dependency
      const { BrowserTracing } = await import('@sentry/tracing');

      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [new BrowserTracing()],
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.0,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('Sentry init skipped (package missing or error):', err?.message ?? err);
    }
  })();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>
);
