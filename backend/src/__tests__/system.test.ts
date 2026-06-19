import request from 'supertest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Deterministic unit coverage for the system router's untested endpoints
// (location, google redirects, ai chat/analyze/find-time/insights, holidays).
// Gemini, the DB, the holidays aggregator and global fetch are all mocked so
// nothing hits the network or a real database. The real-DB ai.smoke.test.ts
// stays the integration counterpart.

// --- Gemini SDK: generateContent reads a per-test reply / error ------------
const geminiState: { reply: string; throwErr: Error | null } = {
  reply: '{"action":"query","message":"ok"}',
  throwErr: null,
};
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async () => {
          if (geminiState.throwErr) throw geminiState.throwErr;
          return { response: { text: () => geminiState.reply } };
        },
      };
    }
  },
}));

// --- DB: insights events query --------------------------------------------
const dbState: { rows: unknown[]; throwErr: Error | null } = { rows: [], throwErr: null };
const makeChain = () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'orderBy', 'limit']) chain[m] = () => chain;
  const resolved = dbState.throwErr
    ? Promise.reject(dbState.throwErr)
    : Promise.resolve(dbState.rows);
  // Avoid an unhandled rejection if a chain is built but never awaited.
  resolved.catch(() => {});
  chain.then = resolved.then.bind(resolved);
  chain.catch = resolved.catch.bind(resolved);
  chain.finally = resolved.finally.bind(resolved);
  return chain;
};
vi.mock('../db', () => ({ getDb: () => makeChain() }));

// --- holidays aggregator ---------------------------------------------------
const holidaysState: { value: unknown[]; throwErr: Error | null } = { value: [], throwErr: null };
vi.mock('../nagerApi', () => ({
  getWorldwideHolidays: async () => {
    if (holidaysState.throwErr) throw holidaysState.throwErr;
    return holidaysState.value;
  },
}));

// --- auth: per-test userId so the insights cache key is isolated -----------
const authState = { userId: 'test-user' };
vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: authState.userId, email: 'me@example.com' }),
  },
}));

import app from '../app.js';

const auth = { Authorization: 'Bearer faketoken' };

describe('System router (mocked deps)', () => {
  beforeEach(() => {
    geminiState.reply = '{"action":"query","message":"ok"}';
    geminiState.throwErr = null;
    dbState.rows = [];
    dbState.throwErr = null;
    holidaysState.value = [];
    holidaysState.throwErr = null;
    authState.userId = 'test-user';
  });

  afterEach(() => vi.restoreAllMocks());

  describe('static + redirect endpoints', () => {
    it('GET / reports the backend is running', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Backend is running!' });
    });

    it('GET /api/users/google redirects to the auth route', async () => {
      const res = await request(app).get('/api/users/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/api/auth/google');
    });

    it('GET /api/users/google/callback forwards the query string', async () => {
      const res = await request(app).get('/api/users/google/callback?code=abc&state=xy');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/api/auth/google/callback?code=abc&state=xy');
    });

    it('GET /api/users/google/callback without a query redirects bare', async () => {
      const res = await request(app).get('/api/users/google/callback');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/api/auth/google/callback');
    });
  });

  describe('GET /api/ai/location', () => {
    it('returns the resolved city on a successful lookup', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ city: 'Kyiv' }), { status: 200 })
      );
      const res = await request(app)
        .get('/api/ai/location')
        .set({ ...auth, 'X-Forwarded-For': '203.0.113.10, 70.0.0.1' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ city: 'Kyiv' });
    });

    it('returns an empty city when the lookup fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
      const res = await request(app)
        .get('/api/ai/location')
        .set({ ...auth, 'X-Forwarded-For': '198.51.100.7' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ city: '' });
    });
  });

  describe('POST /api/ai/chat', () => {
    it('returns 400 when the message is missing', async () => {
      const res = await request(app).post('/api/ai/chat').set(auth).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Valid message/);
    });

    it('returns 400 when the message exceeds 2000 chars', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set(auth)
        .send({ message: 'x'.repeat(2001) });
      expect(res.status).toBe(400);
    });

    it('parses a valid JSON reply and echoes events + history into context', async () => {
      geminiState.reply = '{"action":"create","message":"Created your event"}';
      const res = await request(app)
        .post('/api/ai/chat')
        .set(auth)
        .send({
          message: 'Add a standup tomorrow',
          events: [{ id: 'e1', title: 'Old' }],
          conversationHistory: [{ role: 'user', content: 'hi' }, {}],
        });
      expect(res.status).toBe(200);
      expect(res.body.response).toEqual({ action: 'create', message: 'Created your event' });
      expect(res.body.reply).toBe('Created your event');
    });

    it('falls back to a query response when JSON is missing required fields', async () => {
      geminiState.reply = '{"action":"create"}'; // no message -> throws -> catch fallback
      const res = await request(app)
        .post('/api/ai/chat')
        .set(auth)
        .send({ message: 'do something' });
      expect(res.status).toBe(200);
      expect(res.body.response.action).toBe('query');
    });

    it('falls back to a query response when there is no JSON at all', async () => {
      geminiState.reply = 'Just a plain sentence with no json.';
      const res = await request(app)
        .post('/api/ai/chat')
        .set(auth)
        .send({ message: 'hello there' });
      expect(res.status).toBe(200);
      expect(res.body.response).toEqual({
        action: 'query',
        message: 'Just a plain sentence with no json.',
      });
    });
  });

  describe('POST /api/ai/analyze-schedule', () => {
    it('returns 400 when events is not a valid array', async () => {
      const res = await request(app).post('/api/ai/analyze-schedule').set(auth).send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 when more than 100 events are submitted', async () => {
      const events = Array.from({ length: 101 }, (_, i) => ({ id: i }));
      const res = await request(app).post('/api/ai/analyze-schedule').set(auth).send({ events });
      expect(res.status).toBe(400);
    });

    it('returns an analysis for a valid request', async () => {
      geminiState.reply = 'Your week looks balanced.';
      const res = await request(app)
        .post('/api/ai/analyze-schedule')
        .set(auth)
        .send({ events: [{ id: 'e1' }], timeRange: 'month' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ analysis: 'Your week looks balanced.', timeRange: 'month' });
    });
  });

  describe('POST /api/ai/find-time', () => {
    it('returns 400 for an invalid duration', async () => {
      const res = await request(app).post('/api/ai/find-time').set(auth).send({ duration: 0 });
      expect(res.status).toBe(400);
    });

    it('returns suggestions for a valid duration', async () => {
      geminiState.reply = 'Try 10:00, 14:00 or 16:00.';
      const res = await request(app)
        .post('/api/ai/find-time')
        .set(auth)
        .send({ duration: 30, events: [], preferences: { morning: true } });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ suggestions: 'Try 10:00, 14:00 or 16:00.', duration: 30 });
    });
  });

  describe('GET /api/ai/insights', () => {
    it('returns hasData:false when the user has no events', async () => {
      authState.userId = 'insights-empty';
      dbState.rows = [];
      const res = await request(app).get('/api/ai/insights').set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ insights: [], hasData: false });
    });

    it('returns parsed insights (uk locale) when events and a valid reply exist', async () => {
      authState.userId = 'insights-ok';
      dbState.rows = [{ title: 'Standup', startDate: '2026-06-01' }];
      geminiState.reply =
        '{"insights":["Ранкові зустрічі переважають","Вівторки найзавантаженіші"]}';
      const res = await request(app).get('/api/ai/insights?lang=uk').set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        insights: ['Ранкові зустрічі переважають', 'Вівторки найзавантаженіші'],
        hasData: true,
      });
    });

    it('returns the parse fallback when the reply has no JSON', async () => {
      authState.userId = 'insights-nojson';
      dbState.rows = [{ title: 'Standup', startDate: '2026-06-01' }];
      geminiState.reply = 'no json here';
      const res = await request(app).get('/api/ai/insights').set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ insights: [], hasData: false, error: 'parse' });
    });

    it('returns the parse fallback when the insights array is empty', async () => {
      authState.userId = 'insights-emptyarr';
      dbState.rows = [{ title: 'Standup', startDate: '2026-06-01' }];
      geminiState.reply = '{"insights":[]}';
      const res = await request(app).get('/api/ai/insights').set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ insights: [], hasData: false, error: 'parse' });
    });

    it('propagates an infrastructure error as 500', async () => {
      authState.userId = 'insights-dberr';
      dbState.throwErr = new Error('db connection lost');
      const res = await request(app).get('/api/ai/insights').set(auth);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/v1/holidays/worldwide', () => {
    it('returns 400 when the year is missing or invalid', async () => {
      const res = await request(app).get('/api/v1/holidays/worldwide');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/year/);
    });

    it('returns 400 when the month is out of range', async () => {
      const res = await request(app).get('/api/v1/holidays/worldwide?year=2030&month=13');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/month/);
    });

    it('returns holidays for a year only (month defaults to "all")', async () => {
      holidaysState.value = [{ id: 'h1', date: '2030-01-01', title: 'New Year (UA)' }];
      const res = await request(app).get('/api/v1/holidays/worldwide?year=2030');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ year: 2030, month: 'all', count: 1 });
      expect(res.body.holidays).toHaveLength(1);
    });

    it('echoes a valid month back in the response', async () => {
      holidaysState.value = [];
      const res = await request(app).get('/api/v1/holidays/worldwide?year=2030&month=6');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ year: 2030, month: 6, count: 0 });
    });
  });
});
