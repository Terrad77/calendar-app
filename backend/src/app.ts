import express from 'express';
import cors from 'cors';
import passport from './config/passport.js';
import authRoutes from './features/auth/router.js';
import usersRoutes from './features/users/router.js';
import eventsRoutes from './features/events/router.js';
import calendarRoutes from './features/calendar/router.js';
import sharesRoutes from './features/calendar/sharesRouter.js';
import analyticsRoutes from './features/analytics/router.js';
import systemRoutes from './features/system/router.js';
import configRoutes from './features/config/router.js';
import notificationsRoutes from './features/notifications/router.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(express.json({ limit: '50kb' }));

app.use(
  cors({
    origin: [
      'https://calendar-app-pi-gold.vercel.app',
      'https://calendar-app-git-main-terrad77s-projects.vercel.app',
      'https://calendar-app-7oetemppd-terrad77s-projects.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Unread-Count'],
  })
);
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
// /api/calendar/shares is mounted before /api/calendar.
// Currently safe regardless of order: calendarRoutes has no GET /:id
// or other single-segment catch-all that could match "shares" as a param.
// If you add such a route to features/calendar/router.ts, re-verify this ordering.
app.use('/api/calendar/shares', sharesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use(configRoutes);
app.use(systemRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NotFoundError',
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

app.use(errorHandler);

export default app;
