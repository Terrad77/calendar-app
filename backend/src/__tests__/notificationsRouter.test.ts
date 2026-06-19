import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Per-operation db mock: select/update/delete each draw from their own queue
// in call order; a queued Error makes that call reject.
type Result = unknown[] | Error;

const dbState = {
  select: [] as Result[],
  selectIdx: 0,
  update: [] as Result[],
  updateIdx: 0,
  delete: [] as Result[],
  deleteIdx: 0,
};

const resolveResult = (r: Result | undefined) =>
  r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? []);

const buildChain = (result: Result | undefined) => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'set', 'returning']) {
    chain[m] = () => chain;
  }
  chain.then = (f: unknown, r: unknown) => resolveResult(result).then(f as never, r as never);
  chain.catch = (r: unknown) => resolveResult(result).catch(r as never);
  chain.finally = (f: unknown) => resolveResult(result).finally(f as never);
  return chain;
};

vi.mock('../db', () => ({
  getDb: () => ({
    select: () => buildChain(dbState.select[dbState.selectIdx++]),
    update: () => buildChain(dbState.update[dbState.updateIdx++]),
    delete: () => buildChain(dbState.delete[dbState.deleteIdx++]),
  }),
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: 'test-user', email: 'me@example.com' }),
  },
}));

import app from '../app.js';

const auth = { Authorization: 'Bearer faketoken' };
const NOTIFS = '/api/notifications';

const resetDb = () => {
  dbState.select = [];
  dbState.selectIdx = 0;
  dbState.update = [];
  dbState.updateIdx = 0;
  dbState.delete = [];
  dbState.deleteIdx = 0;
};

describe('Notifications router', () => {
  beforeEach(resetDb);

  describe('GET /api/notifications', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get(NOTIFS);
      expect(res.status).toBe(401);
    });

    it('counts unread from the full set when no filter is applied', async () => {
      dbState.select = [
        [
          { id: 'n1', isRead: false },
          { id: 'n2', isRead: true },
          { id: 'n3', isRead: false },
        ],
      ];
      const res = await request(app).get(NOTIFS).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(3);
      expect(res.body.meta).toMatchObject({ total: 3, unreadCount: 2 });
      expect(res.headers['x-unread-count']).toBe('2');
    });

    it('returns only unread rows and uses their length as the count when unread=true', async () => {
      dbState.select = [
        [
          { id: 'n1', isRead: false },
          { id: 'n2', isRead: false },
        ],
      ];
      const res = await request(app).get(`${NOTIFS}?unread=true`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ total: 2, unreadCount: 2 });
      expect(res.headers['x-unread-count']).toBe('2');
    });

    it('returns 500 when the query fails', async () => {
      dbState.select = [new Error('select failed')];
      const res = await request(app).get(NOTIFS).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('select failed');
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).patch(`${NOTIFS}/n1/read`);
      expect(res.status).toBe(401);
    });

    it('returns 404 when the notification is missing or not owned', async () => {
      dbState.update = [[]];
      const res = await request(app).patch(`${NOTIFS}/n1/read`).set(auth);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Notification not found');
    });

    it('marks the notification as read and returns it', async () => {
      dbState.update = [[{ id: 'n1', isRead: true }]];
      const res = await request(app).patch(`${NOTIFS}/n1/read`).set(auth);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ notification: { id: 'n1', isRead: true } });
    });

    it('returns 500 when the update throws', async () => {
      dbState.update = [new Error('update failed')];
      const res = await request(app).patch(`${NOTIFS}/n1/read`).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('update failed');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete(`${NOTIFS}/n1`);
      expect(res.status).toBe(401);
    });

    it('returns 404 when the notification is missing or not owned', async () => {
      dbState.delete = [[]];
      const res = await request(app).delete(`${NOTIFS}/n1`).set(auth);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Notification not found');
    });

    it('deletes the notification and returns it', async () => {
      dbState.delete = [[{ id: 'n1' }]];
      const res = await request(app).delete(`${NOTIFS}/n1`).set(auth);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ notification: { id: 'n1' } });
    });

    it('returns 500 when the deletion throws', async () => {
      dbState.delete = [new Error('delete failed')];
      const res = await request(app).delete(`${NOTIFS}/n1`).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('delete failed');
    });
  });
});
