import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Per-test database state. checkEventAccess issues two sequential select()
// calls (event lookup, then participant lookup), so the mock serves rows
// from a queue indexed by call order.
const dbState: { queue: unknown[][]; idx: number; throwErr: Error | null } = {
  queue: [],
  idx: 0,
  throwErr: null,
};

const buildChain = (rows: unknown[]) => {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'leftJoin', 'innerJoin', 'where', 'orderBy', 'limit']) {
    chain[method] = () => chain;
  }
  const resolved = Promise.resolve(rows);
  chain.then = resolved.then.bind(resolved);
  chain.catch = resolved.catch.bind(resolved);
  chain.finally = resolved.finally.bind(resolved);
  return chain;
};

vi.mock('../db', () => ({
  getDb: () => {
    if (dbState.throwErr) throw dbState.throwErr;
    return { select: () => buildChain(dbState.queue[dbState.idx++] ?? []) };
  },
}));

import { checkEventAccess } from '../middleware/checkEventAccess.js';

const makeRes = () => {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as unknown as Response['status'];
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as unknown as Response['json'];
  return res as Response & { statusCode?: number; body?: unknown };
};

const makeReq = (over: Partial<Request> = {}): Request =>
  ({ params: {}, ...over }) as unknown as Request;

describe('checkEventAccess middleware', () => {
  beforeEach(() => {
    dbState.queue = [];
    dbState.idx = 0;
    dbState.throwErr = null;
  });

  it('returns 401 when the request has no authenticated user', async () => {
    const req = makeReq({ params: { eventId: 'evt-1' } });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when no event id is present in params', async () => {
    const req = makeReq({
      params: {},
      user: { userId: 'u1', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: 'Validation error' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when the event does not exist', async () => {
    dbState.queue = [[]]; // event lookup -> empty
    const req = makeReq({
      params: { eventId: 'missing' },
      user: { userId: 'u1', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ error: 'Not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('grants the owner access and sets isOwner with null participant status', async () => {
    const event = { id: 'evt-1', userId: 'u1', title: 'Mine' };
    dbState.queue = [[event], []]; // event found, no participant row
    const req = makeReq({
      params: { eventId: 'evt-1' },
      user: { userId: 'u1', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.eventAccess).toEqual({
      event,
      participantStatus: null,
      isOwner: true,
      accessSource: 'owner',
    });
  });

  it('grants a participant access with their status and isOwner false', async () => {
    const event = { id: 'evt-1', userId: 'owner', title: 'Shared' };
    dbState.queue = [[event], [{ status: 'accepted' }]];
    const req = makeReq({
      params: { id: 'evt-1' },
      user: { userId: 'u2', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.eventAccess).toEqual({
      event,
      participantStatus: 'accepted',
      isOwner: false,
      accessSource: 'participant',
    });
  });

  it('returns 404 for a participant who declined the invitation', async () => {
    const event = { id: 'evt-1', userId: 'owner', title: 'Shared' };
    dbState.queue = [[event], [{ status: 'declined' }]];
    const req = makeReq({
      params: { id: 'evt-1' },
      user: { userId: 'u2', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ error: 'Not found', message: 'Event not found' });
    expect(next).not.toHaveBeenCalled();
    expect(req.eventAccess).toBeUndefined();
  });

  it('grants a pending participant access with their status', async () => {
    const event = { id: 'evt-1', userId: 'owner', title: 'Shared' };
    dbState.queue = [[event], [{ status: 'pending' }]];
    const req = makeReq({
      params: { id: 'evt-1' },
      user: { userId: 'u2', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.eventAccess).toEqual({
      event,
      participantStatus: 'pending',
      isOwner: false,
      accessSource: 'participant',
    });
  });

  it('grants a calendar-share viewer access with accessSource share', async () => {
    const event = { id: 'evt-1', userId: 'owner', title: 'Shared' };
    // event found, no participant row, then a calendar_shares grant.
    dbState.queue = [[event], [], [{ id: 'share-1' }]];
    const req = makeReq({
      params: { id: 'evt-1' },
      user: { userId: 'viewer', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.eventAccess).toEqual({
      event,
      participantStatus: null,
      isOwner: false,
      accessSource: 'share',
    });
  });

  it('returns 403 for a user who is neither owner nor participant', async () => {
    const event = { id: 'evt-1', userId: 'owner', title: 'Private' };
    dbState.queue = [[event], []]; // event found, no participant
    const req = makeReq({
      params: { eventId: 'evt-1' },
      user: { userId: 'stranger', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 with the error message when a database call throws', async () => {
    dbState.throwErr = new Error('connection lost');
    const req = makeReq({
      params: { eventId: 'evt-1' },
      user: { userId: 'u1', email: 'test@example.com' },
    } as Partial<Request>);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    await checkEventAccess(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ error: 'Authorization error', message: 'connection lost' });
    expect(next).not.toHaveBeenCalled();
  });
});
