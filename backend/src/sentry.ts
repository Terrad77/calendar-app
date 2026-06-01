import * as Sentry from '@sentry/node';

// Initialize Sentry when SENTRY_DSN is present
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.0,
    release: process.env.SENTRY_RELEASE || undefined,
  });
}

export default Sentry;
