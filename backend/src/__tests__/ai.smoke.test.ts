// Integration smoke tests for the AI endpoints. These run against the REAL Neon
// DB (no DB mock — the postgres driver's TLS works fine here).
//
// Why Gemini + open-meteo are mocked: this environment fails TLS chain
// verification (UNABLE_TO_VERIFY_LEAF_SIGNATURE) for any external HTTPS `fetch`
// from a vitest worker, so real Gemini/open-meteo calls cannot complete here.
// Mocking the Gemini SDK makes the chat/insights paths deterministic, and once
// the SDK is mocked it no longer uses global fetch — so we can safely stub
// open-meteo too and still exercise the full weather-injection wiring end to end
// (mocked weather data must reach the prompt and shape the reply). The real
// Gemini integration was verified live against a running server separately.
//
// Auth: local registration depends on SMTP (verification email), unavailable in
// test runs, so we mint a short-lived JWT with the same secret the app verifies
// against. Zero DB rows are written — fully idempotent (fresh random userId).
//
// The suite auto-skips unless DATABASE_URL points at a real (non-local) DB, so
// CI — which uses a localhost placeholder — stays green.
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock the Gemini SDK before the app imports it. The mock echoes the injected
// weather temperature back into the reply so the weather path is observable.
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: async (prompt: string) => {
          const text = String(prompt);
          const tempMatch = text.match(/Temperature: ([^\n]+)/);
          const reply = text.includes('Current weather')
            ? `Зараз у Харкові: ${tempMatch ? tempMatch[1] : 'дані недоступні'}.`
            : 'CalendAir is a smart AI calendar assistant for managing events.';
          return { response: { text: () => reply } };
        },
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import app from '../app.js';
import { closeDb } from '../db.js';

const databaseUrl = process.env.DATABASE_URL ?? '';
const hasRealDb =
  databaseUrl.length > 0 &&
  !databaseUrl.includes('localhost') &&
  !databaseUrl.includes('127.0.0.1');

// Mirror the app's secret resolution so the minted token verifies either way.
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Deterministic open-meteo payloads (geocoding + current weather).
const GEO_RESPONSE = { results: [{ latitude: 49.98, longitude: 36.25, name: 'Харків' }] };
const FORECAST_RESPONSE = {
  current: { temperature_2m: 18, weathercode: 2, windspeed_10m: 5, relativehumidity_2m: 50 },
};

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe.skipIf(!hasRealDb)('AI endpoints smoke tests', () => {
  // Throwaway identity: a random userId guarantees zero existing events and no
  // collision with the insights cache across repeated runs.
  const testUserId = randomUUID();
  const authToken = jwt.sign(
    { userId: testUserId, email: `smoke-test-${Date.now()}@test.local` },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const auth = { Authorization: `Bearer ${authToken}` };

  beforeAll(() => {
    // Stub open-meteo (geocoding + forecast). The mocked Gemini SDK does not use
    // fetch, so this only affects the weather lookup.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('geocoding-api.open-meteo.com')) {
        return Promise.resolve(jsonResponse(GEO_RESPONSE));
      }
      if (url.includes('api.open-meteo.com')) {
        return Promise.resolve(jsonResponse(FORECAST_RESPONSE));
      }
      return Promise.reject(new Error(`Unexpected fetch in test: ${url}`));
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    // No throwaway rows were created; just close the pool so vitest can exit.
    await closeDb();
  });

  // ── Test 1: insights — no events (fresh user) ─────────────────────────────
  it('GET /api/ai/insights returns hasData:false for a user with no events', async () => {
    const res = await request(app).get('/api/ai/insights').set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.insights)).toBe(true);
    expect(res.body.insights).toHaveLength(0);
    expect(res.body.hasData).toBe(false);
  });

  // ── Test 2: chat — weather query (stubbed open-meteo + mocked Gemini) ──────
  it('POST /api/ai/chat returns a weather reply for Kharkiv', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set(auth)
      .send({ message: 'Яка погода в Харкові?', location: 'Харків', language: 'uk' });

    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(10);
    // The stubbed temperature (18°C) must have reached the prompt and the reply,
    // proving the open-meteo -> prompt weather-injection wiring works.
    expect(res.body.reply).toContain('18');
    // Backward-compatible alias must still be present.
    expect(res.body.response).toBeDefined();
    expect(typeof res.body.response.message).toBe('string');
  });

  // ── Test 3: chat — general question ───────────────────────────────────────
  it('POST /api/ai/chat answers a general question about CalendAir', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set(auth)
      .send({ message: 'What is CalendAir?' });

    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(0);
    expect(res.body.reply).toBe(res.body.response.message);
  });

  // ── Test 4: chat — auth required ──────────────────────────────────────────
  it('POST /api/ai/chat returns 401 without a token', async () => {
    const res = await request(app).post('/api/ai/chat').send({ message: 'hello' });
    expect(res.status).toBe(401);
  });

  // ── Test 5: insights — auth required ──────────────────────────────────────
  it('GET /api/ai/insights returns 401 without a token', async () => {
    const res = await request(app).get('/api/ai/insights');
    expect(res.status).toBe(401);
  });
});
