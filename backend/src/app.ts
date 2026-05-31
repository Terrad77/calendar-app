import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import eventsRoutes from './routes/eventsRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

app.use(express.json({ limit: '50kb' }));
app.use(passport.initialize());
app.use(
  cors({
    origin: [
      'https://calendar-app-pi-gold.vercel.app',
      'https://calendar-app-git-main-terrad77s-projects.vercel.app',
      'https://calendar-app-7oetemppd-terrad77s-projects.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Calendar AI Assistant' });
});

app.get('/api/ai/health', (_req, res) => {
  const googleAIAvailable = !!process.env.GOOGLE_AI_API_KEY;

  res.json({
    status: googleAIAvailable ? 'ok' : 'error',
    service: 'AI Assistant(Google Gemini)',
    available: googleAIAvailable,
    googleAI: {
      configured: googleAIAvailable,
      keyLength: process.env.GOOGLE_AI_API_KEY?.length || 0,
      keyPrefix: process.env.GOOGLE_AI_API_KEY?.substring(0, 10) + '...',
    },
    timestamp: new Date().toISOString(),
    message: googleAIAvailable
      ? 'AI service is ready (Gemini)'
      : 'GOOGLE_AI_API_KEY not configured',
  });
});

app.get('/api/auth/google', (_req, res) => {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
  ) {
    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=${encodeURIComponent(
        process.env.GOOGLE_CALLBACK_URL
      )}&scope=profile%20email&client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}`
    );
    return;
  }

  res.status(503).json({
    error: 'Google OAuth is not configured',
    message: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in backend env.',
  });
});

export default app;
