import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import App from './App';
import { store, persistor } from './redux/store';
import { ThemeProvider } from './contexts/ThemeContext';
import './locales';

const queryClient = new QueryClient();

type SentryInitOptions = {
  dsn: string;
  integrations: unknown[];
  tracesSampleRate: number;
  environment: string;
  release?: string;
};

type SentryModule = {
  init: (options: SentryInitOptions) => void;
};

type BrowserTracingModule = {
  BrowserTracing: new () => unknown;
};

// Initialize Sentry dynamically only when DSN is provided. This keeps
// local development and pre-commit hooks working when @sentry/* packages
// are not installed (they are optional dev-deps for release builds).
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  void (async () => {
    try {
      const sentryPkg = '@' + 'sentry/react';
      const tracingPkg = '@' + 'sentry/tracing';
      const sentryModule: unknown = await import(/* @vite-ignore */ sentryPkg);
      const tracingModule: unknown = await import(/* @vite-ignore */ tracingPkg);
      const Sentry = sentryModule as SentryModule;
      const { BrowserTracing } = tracingModule as BrowserTracingModule;

      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [new BrowserTracing()],
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
