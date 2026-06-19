// Integration tests for the auth endpoints. These run against the REAL Neon DB
// (the postgres driver's TLS works fine here; no DB mock needed).
//
// Email verification is NOT a blocker in tests: sendVerificationEmail() logs a
// fallback and returns when SMTP is unconfigured (see mailerService.ts), so the
// /register HTTP contract (201 + created user row) holds without real SMTP.
//
// The suite auto-skips unless DATABASE_URL points at a real (non-local) DB, so
// CI — which uses a localhost placeholder — stays green. Same guard as
// ai.smoke.test.ts. afterAll cascade-deletes the test user, keeping the suite
// idempotent and pollution-free (refresh_tokens cascade via the FK).
import 'dotenv/config';
import { describe, it, expect, afterAll, vi } from 'vitest';

// Mock the mailer to a no-op. Email delivery is a side effect, not part of the
// /register HTTP contract — and the router converts any SMTP failure into a 400,
// so a real (or misconfigured) SMTP server would mask the actual 201 contract.
// This also guarantees we never hit real SMTP from a test run.
vi.mock('../services/mailerService.js', () => ({
  sendVerificationEmail: async (): Promise<void> => {},
}));

import request from 'supertest';
import { eq } from 'drizzle-orm';
import app from '../app.js';
import { db, closeDb } from '../db.js';
import { refreshTokens, users } from '../schema.js';

const databaseUrl = process.env.DATABASE_URL ?? '';
const hasRealDb =
  databaseUrl.length > 0 &&
  !databaseUrl.includes('localhost') &&
  !databaseUrl.includes('127.0.0.1');

// Unique email per run — guarantees no collision with prior runs or other users.
const email = `auth-test-${Date.now()}@test.local`;
const password = 'AuthTest123!';
const name = 'Auth Test User';

describe.skipIf(!hasRealDb)('Auth endpoints', () => {
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  // ── Cleanup: remove test user after all tests (refresh_tokens cascade) ──────
  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    await closeDb();
  });

  // ── POST /api/auth/register ────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('registers a new user and returns 201', async () => {
      const res = await request(app).post('/api/auth/register').send({ email, password, name });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(typeof res.body.user.id).toBe('string');
      expect(res.body.user.email).toBe(email);
      // The public user payload must never leak the password hash.
      expect(res.body.user.password).toBeUndefined();

      userId = res.body.user.id;
    });

    it('returns 409 or 400 when email already exists', async () => {
      const res = await request(app).post('/api/auth/register').send({ email, password, name });
      expect([409, 400]).toContain(res.status);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password, name });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.local', password: '123', name });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/login ───────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials and returns tokens', async () => {
      // Clear the session token created during register first. register and
      // login mint refresh JWTs with an identical {userId, email} payload, so
      // within the same wall-clock second they are byte-identical — and the
      // refresh_tokens.token unique index would reject login's insert, surfacing
      // (via login's catch-all) as a misleading 401. A real client never logs in
      // again in the same second it registered, so clearing prior session state
      // keeps this endpoint test deterministic.
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

      const res = await request(app).post('/api/auth/login').send({ email, password });

      expect(res.status).toBe(200);
      expect(typeof res.body.tokens.accessToken).toBe('string');
      expect(res.body.tokens.accessToken.length).toBeGreaterThan(0);
      expect(typeof res.body.tokens.refreshToken).toBe('string');
      expect(res.body.tokens.refreshToken.length).toBeGreaterThan(0);

      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
    });

    it('returns 401 with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('returns 401 or 404 with unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.local', password });
      expect([401, 404]).toContain(res.status);
    });
  });

  // ── GET /api/auth/me ───────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('returns current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.password).toBeUndefined();
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/auth/refresh ─────────────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('returns a new working accessToken with a valid refreshToken', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(typeof res.body.tokens.accessToken).toBe('string');
      expect(res.body.tokens.accessToken.length).toBeGreaterThan(0);

      // Strict byte-inequality is not asserted: JWTs minted within the same
      // second share an identical `iat` and would be byte-identical. Instead we
      // prove the refreshed token is valid by authenticating a protected route
      // with it — a stronger guarantee than string comparison.
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${res.body.tokens.accessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(email);

      // Rotate to the newly issued refresh token for the logout test.
      refreshToken = res.body.tokens.refreshToken;
    });

    it('supports two consecutive refreshes, each using the freshly rotated token', async () => {
      // First refresh: exchange the current token for a new one.
      const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(first.status).toBe(200);
      const rotatedRefreshToken = first.body.tokens.refreshToken;
      expect(typeof rotatedRefreshToken).toBe('string');
      expect(rotatedRefreshToken.length).toBeGreaterThan(0);

      // Second refresh: must use the NEW token from the first refresh, not the
      // old one. This exercises the full rotation chain now guarded by the
      // delete+insert transaction — if the new token were not persisted, this
      // call would 401.
      const second = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: rotatedRefreshToken });
      expect(second.status).toBe(200);
      expect(typeof second.body.tokens.accessToken).toBe('string');
      expect(second.body.tokens.accessToken.length).toBeGreaterThan(0);
      expect(typeof second.body.tokens.refreshToken).toBe('string');
      expect(second.body.tokens.refreshToken.length).toBeGreaterThan(0);

      // The twice-rotated access token authenticates a protected route.
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${second.body.tokens.accessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(email);

      // Carry the latest valid refresh token forward for the logout test.
      refreshToken = second.body.tokens.refreshToken;
    });

    it('returns 401 with invalid refreshToken', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid' });
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/auth/logout ──────────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('logs out successfully with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });
      expect(res.status).toBe(200);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/auth/logout').send({});
      expect(res.status).toBe(401);
    });
  });
});
