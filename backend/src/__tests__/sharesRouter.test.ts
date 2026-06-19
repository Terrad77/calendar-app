import request from 'supertest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Configurable database mock. Each top-level builder (select/insert/update/
// delete) draws its result from its own queue in call order; a queued Error
// makes that call reject. insert().values() and update().set() payloads are
// captured so tests can assert what was written (e.g. whether a notification
// row was actually created).
type Result = unknown[] | Error;

const dbState = {
  select: [] as Result[],
  selectIdx: 0,
  insert: [] as Result[],
  insertIdx: 0,
  update: [] as Result[],
  updateIdx: 0,
  delete: [] as Result[],
  deleteIdx: 0,
  inserted: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
};

const resolveResult = (r: Result | undefined) =>
  r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? []);

const buildChain = (op: 'select' | 'insert' | 'update' | 'delete', result: Result | undefined) => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'leftJoin', 'innerJoin', 'where', 'orderBy', 'limit', 'returning']) {
    chain[m] = () => chain;
  }
  chain.values = (v: Record<string, unknown>) => {
    if (op === 'insert') dbState.inserted.push(v);
    return chain;
  };
  chain.set = (v: Record<string, unknown>) => {
    if (op === 'update') dbState.updated.push(v);
    return chain;
  };
  chain.then = (f: unknown, r: unknown) => resolveResult(result).then(f as never, r as never);
  chain.catch = (r: unknown) => resolveResult(result).catch(r as never);
  chain.finally = (f: unknown) => resolveResult(result).finally(f as never);
  return chain;
};

vi.mock('../db', () => ({
  getDb: () => ({
    select: () => buildChain('select', dbState.select[dbState.selectIdx++]),
    insert: () => buildChain('insert', dbState.insert[dbState.insertIdx++]),
    update: () => buildChain('update', dbState.update[dbState.updateIdx++]),
    delete: () => buildChain('delete', dbState.delete[dbState.deleteIdx++]),
  }),
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: 'test-user', email: 'me@example.com' }),
  },
}));

import app from '../app.js';

const auth = { Authorization: 'Bearer faketoken' };
const SHARES = '/api/calendar/shares';

const resetDb = () => {
  dbState.select = [];
  dbState.selectIdx = 0;
  dbState.insert = [];
  dbState.insertIdx = 0;
  dbState.update = [];
  dbState.updateIdx = 0;
  dbState.delete = [];
  dbState.deleteIdx = 0;
  dbState.inserted = [];
  dbState.updated = [];
};

describe('Calendar shares router', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  describe('POST /api/calendar/shares', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post(SHARES).send({ targetUserId: 'u2' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when targetUserId is missing', async () => {
      const res = await request(app).post(SHARES).set(auth).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ data: null, error: 'targetUserId is required' });
    });

    it('returns 400 when sharing with yourself', async () => {
      const res = await request(app).post(SHARES).set(auth).send({ targetUserId: 'test-user' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot share your calendar with yourself');
    });

    it('returns 404 when the target user does not exist', async () => {
      dbState.select = [[]]; // target lookup -> none
      const res = await request(app).post(SHARES).set(auth).send({ targetUserId: 'ghost' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Target user not found');
    });

    it('creates a new share, defaults permission to read, and notifies the target', async () => {
      dbState.select = [[{ id: 'u2', name: 'Bob' }], []]; // target found, no existing share
      dbState.insert = [[{ id: 'share-1' }], []]; // share insert returning, then notification
      const res = await request(app)
        .post(SHARES)
        .set(auth)
        .send({ targetUserId: 'u2', permissionLevel: 'banana' }); // invalid -> defaults to read

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ share: { id: 'share-1' } });
      // The share row was written with the defaulted permission.
      expect(dbState.inserted[0]).toMatchObject({
        ownerId: 'test-user',
        sharedWithId: 'u2',
        permission: 'read',
      });
      // A SYSTEM notification was actually created for the target.
      expect(dbState.inserted.some((v) => v.title === 'Calendar shared with you')).toBe(true);
    });

    it('honours an explicit write permission level', async () => {
      dbState.select = [[{ id: 'u2', name: 'Bob' }], []];
      dbState.insert = [[{ id: 'share-1' }], []];
      await request(app)
        .post(SHARES)
        .set(auth)
        .send({ targetUserId: 'u2', permissionLevel: 'write' });

      expect(dbState.inserted[0]).toMatchObject({ permission: 'write' });
    });

    it('updates an existing share without creating a second notification', async () => {
      dbState.select = [[{ id: 'u2', name: 'Bob' }], [{ id: 'existing-1' }]]; // existing share found
      dbState.update = [[{ id: 'existing-1', permission: 'write' }]];
      const res = await request(app)
        .post(SHARES)
        .set(auth)
        .send({ targetUserId: 'u2', permissionLevel: 'write' });

      expect(res.status).toBe(201);
      expect(res.body.data.share).toMatchObject({ id: 'existing-1' });
      expect(dbState.updated[0]).toMatchObject({ permission: 'write' });
      // Upsert update path must not insert anything (no duplicate notification).
      expect(dbState.inserted).toHaveLength(0);
    });

    it('still returns 201 when the notification insert fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      dbState.select = [[{ id: 'u2', name: 'Bob' }], []];
      dbState.insert = [[{ id: 'share-1' }], new Error('notif down')]; // share ok, notification rejects
      const res = await request(app).post(SHARES).set(auth).send({ targetUserId: 'u2' });

      expect(res.status).toBe(201);
      expect(res.body.data.share).toMatchObject({ id: 'share-1' });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('returns 500 when the database throws', async () => {
      dbState.select = [new Error('db boom')];
      const res = await request(app).post(SHARES).set(auth).send({ targetUserId: 'u2' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('db boom');
    });
  });

  describe('GET /api/calendar/shares', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get(SHARES);
      expect(res.status).toBe(401);
    });

    it('splits rows into sharedByMe and sharedWithMe by ownership', async () => {
      dbState.select = [
        [
          {
            id: 's1',
            ownerId: 'test-user',
            sharedWithId: 'u2',
            permission: 'read',
            createdAt: '2026-01-01',
            ownerName: 'Bob',
          },
          {
            id: 's2',
            ownerId: 'u3',
            sharedWithId: 'test-user',
            permission: 'write',
            createdAt: '2026-01-02',
            ownerName: 'Carol',
          },
        ],
      ];

      const res = await request(app).get(SHARES).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data.sharedByMe).toEqual([
        {
          id: 's1',
          sharedWithId: 'u2',
          sharedWithName: 'Bob',
          permission: 'read',
          createdAt: '2026-01-01',
        },
      ]);
      expect(res.body.data.sharedWithMe).toEqual([
        {
          id: 's2',
          ownerId: 'u3',
          ownerName: 'Carol',
          permission: 'write',
          createdAt: '2026-01-02',
        },
      ]);
    });

    it('returns 500 when the query fails', async () => {
      dbState.select = [new Error('select failed')];
      const res = await request(app).get(SHARES).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('select failed');
    });
  });

  describe('DELETE /api/calendar/shares/:shareId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete(`${SHARES}/s1`);
      expect(res.status).toBe(401);
    });

    it('returns 404 when the share is missing or not owned by the actor', async () => {
      dbState.select = [[]]; // no share owned by actor
      const res = await request(app).delete(`${SHARES}/s1`).set(auth);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Share not found or you do not own it');
    });

    it('revokes the share and notifies the other party', async () => {
      dbState.select = [[{ id: 's1', sharedWithId: 'u2' }]];
      dbState.delete = [[]];
      dbState.insert = [[]]; // notification
      const res = await request(app).delete(`${SHARES}/s1`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ message: 'Calendar share revoked' });
      expect(dbState.inserted.some((v) => v.title === 'Calendar access revoked')).toBe(true);
    });

    it('still returns 200 when the revoke notification fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      dbState.select = [[{ id: 's1', sharedWithId: 'u2' }]];
      dbState.delete = [[]];
      dbState.insert = [new Error('notif down')]; // notification insert rejects
      const res = await request(app).delete(`${SHARES}/s1`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ message: 'Calendar share revoked' });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('returns 500 when deletion throws', async () => {
      dbState.select = [[{ id: 's1', sharedWithId: 'u2' }]];
      dbState.delete = [new Error('delete failed')];
      const res = await request(app).delete(`${SHARES}/s1`).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('delete failed');
    });
  });
});
