import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import App from './App';
import { store, persistor } from './redux/store';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './contexts/ThemeContext';
import './locales';

type SentryModule = {
  init: (options: {
    dsn: string;
    integrations?: unknown[];
    tracesSampleRate: number;
    environment: string;
    release?: string;
  }) => void;
};

// Initialize Sentry dynamically only when DSN is provided.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  void (async () => {
    try {
      const sentryModule = (await import('@sentry/react')) as unknown;

      // Type assertion to SentryModule type
      const Sentry = sentryModule as SentryModule;

      Sentry.init({
        dsn: SENTRY_DSN,
        // В Sentry v10 интеграция трассировки больше не требуется вручную!
        // Она включается автоматически благодаря строке ниже.
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.0,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
      });
    } catch (err: unknown) {
      console.warn(
        'Sentry init skipped (package missing or error):',
        err instanceof Error ? err.message : String(err)
      );
    }
  })();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <BrowserRouter>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </QueryClientProvider>
  </StrictMode>
);
