import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Per-test database state. The chain records the limit() argument so the
// test can assert the router caps the result set, and can reject to drive
// the catch branch.
const dbState: { rows: unknown[]; limitArg: number | undefined; throwErr: Error | null } = {
  rows: [],
  limitArg: undefined,
  throwErr: null,
};

const buildChain = () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.from = () => chain;
  chain.limit = (n: number) => {
    dbState.limitArg = n;
    return dbState.throwErr ? Promise.reject(dbState.throwErr) : Promise.resolve(dbState.rows);
  };
  return chain;
};

vi.mock('../db', () => ({
  getDb: () => buildChain(),
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: 'test-user', email: 'test@example.com' }),
  },
}));

import app from '../app.js';

const auth = { Authorization: 'Bearer faketoken' };

describe('Users router', () => {
  beforeEach(() => {
    dbState.rows = [];
    dbState.limitArg = undefined;
    dbState.throwErr = null;
  });

  it('GET /api/users without auth returns 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'Authentication required' });
  });

  it('GET /api/users returns the public user shape for an authorized request', async () => {
    dbState.rows = [
      {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret-hash',
        jobTitle: 'Engineer',
        preferredCountry: 'UA',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];

    const res = await request(app).get('/api/users').set(auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.result)).toBe(true);
    expect(res.body.result).toHaveLength(1);
    expect(res.body.result[0]).toEqual({
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      jobTitle: 'Engineer',
      preferredCountry: 'UA',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    // Sensitive fields must not leak through the public projection.
    expect(res.body.result[0]).not.toHaveProperty('password');
  });

  it('coerces empty jobTitle and preferredCountry to null', async () => {
    dbState.rows = [
      {
        id: 'u2',
        name: 'Bob',
        email: 'bob@example.com',
        jobTitle: '',
        preferredCountry: null,
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ];

    const res = await request(app).get('/api/users').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.result[0].jobTitle).toBeNull();
    expect(res.body.result[0].preferredCountry).toBeNull();
  });

  it('caps the query at 100 rows', async () => {
    dbState.rows = Array.from({ length: 150 }, (_, i) => ({
      id: `u${i}`,
      name: `User ${i}`,
      email: `u${i}@example.com`,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));

    const res = await request(app).get('/api/users').set(auth);

    expect(res.status).toBe(200);
    expect(dbState.limitArg).toBe(100);
  });

  it('returns 500 when the database query fails', async () => {
    dbState.throwErr = new Error('db down');

    const res = await request(app).get('/api/users').set(auth);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Failed to fetch users' });
  });
});
