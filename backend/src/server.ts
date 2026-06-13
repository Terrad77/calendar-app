// Dev only: a local TLS-interception proxy breaks Node's cert verification for
// outbound fetch (weather / IP geolocation APIs). Relax it outside production.
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import './sentry.js';
import 'dotenv/config';

import type { Server } from 'http';
import app from './app.js';
import { closeDb } from './db.js';

const PORT = Number(process.env.PORT ?? 3001);
const SHUTDOWN_TIMEOUT_MS = 10_000;

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, error?: unknown) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (error) {
    console.error(`[shutdown:${signal}]`, error);
  } else {
    console.log(`[shutdown:${signal}] received`);
  }

  const forceExitTimer = setTimeout(() => {
    console.error(`[shutdown:${signal}] timed out after ${SHUTDOWN_TIMEOUT_MS}ms`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });

    await closeDb();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (shutdownError) {
    clearTimeout(forceExitTimer);
    console.error(`[shutdown:${signal}] failed`, shutdownError);
    process.exit(1);
  }
}

function registerProcessHandlers() {
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    void shutdown('unhandledRejection', reason);
  });

  process.on('uncaughtException', (error) => {
    void shutdown('uncaughtException', error);
  });
}

function startServer() {
  validateEnvironment();
  registerProcessHandlers();

  server = app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Authentication enabled');
    console.log('AI Calendar Assistant ready');
    console.log('Holidays endpoint: /api/v1/holidays/worldwide?year=<YEAR>&month=<OPTIONAL_MONTH>');
    console.log('AI Chat endpoint: /api/ai/chat (POST)');
    console.log('AI Analyze endpoint: /api/ai/analyze-schedule (POST)');
    console.log('AI Find Time endpoint: /api/ai/find-time (POST)');
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { validateEnvironment, shutdown, startServer };
