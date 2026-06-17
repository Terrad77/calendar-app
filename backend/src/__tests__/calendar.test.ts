import request from 'supertest';
import { vi, describe, it, expect } from 'vitest';

// Chainable drizzle query-builder mock: every builder method returns the
// builder itself, and awaiting it resolves to the provided rows.
const makeChain = (rows: unknown[] = []) => {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'from', 'leftJoin', 'innerJoin', 'where', 'orderBy', 'limit']) {
    chain[method] = () => chain;
  }
  const resolved = Promise.resolve(rows);
  chain.then = resolved.then.bind(resolved);
  chain.catch = resolved.catch.bind(resolved);
  chain.finally = resolved.finally.bind(resolved);
  return chain;
};

vi.mock('../db', () => ({
  getDb: () => makeChain([]),
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: 'test-user', email: 'test@example.com' }),
  },
}));

import app from '../app.js';

describe('Calendar routes', () => {
  const auth = { Authorization: 'Bearer faketoken' };

  it('GET /api/calendar/my-events without auth returns 401', async () => {
    const res = await request(app).get('/api/calendar/my-events');
    expect(res.status).toBe(401);
  });

  it('GET /api/calendar/my-events returns an events envelope when authorized', async () => {
    const res = await request(app).get('/api/calendar/my-events').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data.events');
    expect(Array.isArray(res.body.data.events)).toBe(true);
    expect(res.body.meta).toMatchObject({ total: 0 });
  });

  it('GET /api/calendar/invitations/pending returns an invitations envelope', async () => {
    const res = await request(app).get('/api/calendar/invitations/pending').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data.invitations');
    expect(Array.isArray(res.body.data.invitations)).toBe(true);
  });

  it('POST /api/calendar/:eventId/invite without auth returns 401', async () => {
    const res = await request(app).post('/api/calendar/evt-1/invite').send({ email: 'a@b.c' });
    expect(res.status).toBe(401);
  });

  it('POST /api/calendar/:eventId/invite requires an email', async () => {
    const res = await request(app).post('/api/calendar/evt-1/invite').set(auth).send({});
    expect(res.status).toBe(400);
  });

  it('PUT /api/calendar/invitations/:id/respond rejects an invalid status', async () => {
    const res = await request(app)
      .put('/api/calendar/invitations/inv-1/respond')
      .set(auth)
      .send({ status: 'maybe' });
    expect(res.status).toBe(400);
  });

  it('legacy CRUD path /api/calendar (no longer mounted) is not found', async () => {
    const res = await request(app).post('/api/calendar').set(auth).send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});
