import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

// Direct unit tests for the invitation controller and its internal helpers
// (loadInvitationById, toInvitationRecord, getCurrentUserId), invoked with
// mock req/res rather than through the HTTP layer. getDb is mocked with
// per-operation result queues.
type Result = unknown[] | Error;

const dbState = {
  select: [] as Result[],
  selectIdx: 0,
  insert: [] as Result[],
  insertIdx: 0,
  update: [] as Result[],
  updateIdx: 0,
  inserted: [] as Record<string, unknown>[],
};

const resolveResult = (r: Result | undefined) =>
  r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? []);

const buildChain = (op: 'select' | 'insert' | 'update', result: Result | undefined) => {
  const chain: Record<string, unknown> = {};
  for (const m of [
    'from',
    'where',
    'innerJoin',
    'leftJoin',
    'orderBy',
    'limit',
    'set',
    'returning',
    'onConflictDoUpdate',
  ]) {
    chain[m] = () => chain;
  }
  chain.values = (v: Record<string, unknown>) => {
    if (op === 'insert') dbState.inserted.push(v);
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
  }),
}));

import {
  inviteUser,
  listPendingInvitations,
  respondToInvitation,
} from '../controllers/invitationController.js';

const makeRes = () => {
  const res: Partial<Response> & { statusCode?: number; body?: any } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as unknown as Response['status'];
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as unknown as Response['json'];
  return res as Response & { statusCode?: number; body?: any };
};

const makeReq = (over: Partial<Request> = {}): Request =>
  ({ params: {}, body: {}, ...over }) as unknown as Request;

const me = { userId: 'me', email: 'me@example.com' };

// A full invitation row as returned by the loadInvitationById projection.
const invitationRow = (over: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  eventId: 'evt-1',
  userId: 'other',
  title: 'Sync',
  startDate: '2030-01-01',
  startTime: '10:00',
  organizerEmail: 'me@example.com',
  status: 'pending',
  invitedAt: new Date('2030-01-01T00:00:00Z'),
  updatedAt: new Date('2030-01-01T00:00:00Z'),
  ...over,
});

const resetDb = () => {
  dbState.select = [];
  dbState.selectIdx = 0;
  dbState.insert = [];
  dbState.insertIdx = 0;
  dbState.update = [];
  dbState.updateIdx = 0;
  dbState.inserted = [];
};

describe('invitationController', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  describe('inviteUser', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = makeRes();
      await inviteUser(makeReq({ params: { eventId: 'evt-1' }, body: { email: 'a@b.c' } }), res);
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when eventId or email is missing', async () => {
      const res = makeRes();
      await inviteUser(makeReq({ params: { eventId: 'evt-1' }, body: {}, user: me }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ error: 'eventId and email are required' });
    });

    it('returns 404 when the event does not exist', async () => {
      dbState.select = [[]];
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'a@b.c' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Event not found');
    });

    it('returns 403 when the caller does not own the event', async () => {
      dbState.select = [[{ id: 'evt-1', userId: 'someone-else', title: 'X' }]];
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'a@b.c' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when the invited user does not exist', async () => {
      dbState.select = [[{ id: 'evt-1', userId: 'me', title: 'X' }], []];
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'ghost@b.c' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('returns 400 when inviting yourself', async () => {
      dbState.select = [[{ id: 'evt-1', userId: 'me', title: 'X' }], [{ id: 'me' }]];
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'me@example.com' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('You cannot invite yourself');
    });

    it('creates the invitation, loads it, and notifies the invitee (201)', async () => {
      dbState.select = [
        [{ id: 'evt-1', userId: 'me', title: 'Sync', startDate: '2030-01-01' }],
        [{ id: 'other' }],
        [invitationRow()], // loadInvitationById
      ];
      dbState.insert = [[{ id: 'inv-1' }], []]; // upsert returning, then notification
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'other@b.c' }, user: me }),
        res
      );

      expect(res.statusCode).toBe(201);
      expect(res.body.data.invitation).toMatchObject({ id: 'inv-1' });
      expect(res.body.meta).toMatchObject({ status: 'pending' });
      // The INVITATION notification was actually written.
      expect(dbState.inserted.some((v) => v.type === 'INVITATION')).toBe(true);
    });

    it('returns 201 with a null invitation when the upsert yields no row', async () => {
      dbState.select = [
        [{ id: 'evt-1', userId: 'me', title: 'Sync', startDate: '2030-01-01' }],
        [{ id: 'other' }],
      ];
      dbState.insert = [[]]; // upsert returns nothing
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'other@b.c' }, user: me }),
        res
      );

      expect(res.statusCode).toBe(201);
      expect(res.body.data.invitation).toBeNull();
      // No notification attempted when there is no upserted row.
      expect(dbState.inserted.some((v) => v.type === 'INVITATION')).toBe(false);
    });

    it('still returns 201 when the notification insert fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      dbState.select = [
        [{ id: 'evt-1', userId: 'me', title: 'Sync', startDate: '2030-01-01' }],
        [{ id: 'other' }],
        [invitationRow()],
      ];
      dbState.insert = [[{ id: 'inv-1' }], new Error('notif down')];
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'other@b.c' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(201);
    });

    it('returns 500 when a database call throws', async () => {
      dbState.select = [new Error('db boom')];
      const res = makeRes();
      await inviteUser(
        makeReq({ params: { eventId: 'evt-1' }, body: { email: 'a@b.c' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('db boom');
    });
  });

  describe('listPendingInvitations', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = makeRes();
      await listPendingInvitations(makeReq({}), res);
      expect(res.statusCode).toBe(401);
    });

    it('returns mapped invitations with a total', async () => {
      dbState.select = [[invitationRow(), invitationRow({ id: 'inv-2' })]];
      const res = makeRes();
      await listPendingInvitations(makeReq({ user: me }), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.invitations).toHaveLength(2);
      expect(res.body.data.invitations[0]).toMatchObject({ id: 'inv-1', status: 'pending' });
      expect(res.body.meta).toMatchObject({ total: 2 });
    });

    it('returns 500 when a row violates integrity (missing id)', async () => {
      // toInvitationRecord throws on a null id; the catch maps it to 500.
      dbState.select = [[{ title: 'No id row' }]];
      const res = makeRes();
      await listPendingInvitations(makeReq({ user: me }), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toMatch(/id is null/);
    });

    it('returns 500 when the query throws', async () => {
      dbState.select = [new Error('select failed')];
      const res = makeRes();
      await listPendingInvitations(makeReq({ user: me }), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('select failed');
    });
  });

  describe('respondToInvitation', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: { status: 'accepted' } }),
        res
      );
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when invitationId or status is missing', async () => {
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: {}, user: me }),
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invitationId and status are required');
    });

    it('returns 400 for a status other than accepted/declined', async () => {
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: { status: 'maybe' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('status must be accepted or declined');
    });

    it('returns 404 when the invitation is not found', async () => {
      dbState.select = [[]]; // loadInvitationById -> none
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: { status: 'accepted' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Invitation not found');
    });

    it('updates the invitation and returns the reloaded record', async () => {
      dbState.select = [
        [invitationRow({ status: 'pending' })], // current
        [invitationRow({ status: 'accepted' })], // reloaded after update
      ];
      dbState.update = [[{ id: 'inv-1' }]];
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: { status: 'accepted' }, user: me }),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.data.invitation).toMatchObject({ id: 'inv-1', status: 'accepted' });
    });

    it('falls back to the current record when the update returns no row', async () => {
      dbState.select = [[invitationRow({ status: 'pending' })]];
      dbState.update = [[]]; // update returns nothing
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: { status: 'declined' }, user: me }),
        res
      );

      expect(res.statusCode).toBe(200);
      // No reload select consumed; the current invitation is returned as-is.
      expect(res.body.data.invitation).toMatchObject({ id: 'inv-1', status: 'pending' });
    });

    it('returns 500 when a database call throws', async () => {
      dbState.select = [new Error('load failed')];
      const res = makeRes();
      await respondToInvitation(
        makeReq({ params: { invitationId: 'inv-1' }, body: { status: 'accepted' }, user: me }),
        res
      );
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('load failed');
    });
  });
});
