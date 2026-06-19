import request from 'supertest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Per-operation db mock (select/insert/update/delete each have their own
// result queue, consumed in call order; a queued Error rejects). insert
// .values() and update .set() payloads are captured so the PUT merge logic
// can be asserted field by field.
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
const EVENTS = '/api/events';

// A complete event row; toEventResponse reads colors[0] and many fields, so
// rows must be fully populated.
const makeRow = (over: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  userId: 'test-user',
  title: 'Title',
  description: 'desc',
  startDate: '2030-01-01',
  endDate: '2030-01-02',
  startTime: '10:00',
  endTime: '11:00',
  location: 'Loc',
  countryCode: 'UA',
  reminderTime: '09:00',
  isRecurring: false,
  isPublic: false,
  isPrivate: false,
  completed: false,
  priority: 'low',
  eventType: 'task',
  colors: ['default'],
  participants: [] as string[],
  metadata: {} as Record<string, unknown>,
  createdAt: new Date('2030-01-01T00:00:00Z'),
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
  dbState.delete = [];
  dbState.deleteIdx = 0;
  dbState.inserted = [];
  dbState.updated = [];
};

describe('Events router', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  describe('GET /api/events', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get(EVENTS);
      expect(res.status).toBe(401);
    });

    it('returns the caller own events serialized', async () => {
      dbState.select = [[makeRow(), makeRow({ id: 'evt-2', title: 'Second' })]];
      const res = await request(app).get(EVENTS).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(2);
      expect(res.body.events[0]).toMatchObject({ id: 'evt-1', title: 'Title', color: 'default' });
    });

    it('filters another user events down to public or participant rows', async () => {
      dbState.select = [
        [
          makeRow({ id: 'pub', userId: 'other', isPublic: true }),
          makeRow({ id: 'part', userId: 'other', isPublic: false, participants: ['test-user'] }),
          makeRow({ id: 'priv', userId: 'other', isPublic: false, participants: ['stranger'] }),
        ],
      ];
      const res = await request(app).get(`${EVENTS}?userId=other`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.events.map((e: { id: string }) => e.id)).toEqual(['pub', 'part']);
    });

    it('accepts from/to/eventType filter params', async () => {
      dbState.select = [[makeRow()]];
      const res = await request(app)
        .get(`${EVENTS}?from=2030-01-01&to=2030-12-31&eventType=task`)
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(1);
    });

    it('returns 500 when the query fails', async () => {
      dbState.select = [new Error('select failed')];
      const res = await request(app).get(EVENTS).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch events');
    });
  });

  describe('GET /api/events/:id', () => {
    it('marks the owner with accessRole owner and null participant status', async () => {
      // checkEventAccess: event lookup, then participant lookup.
      dbState.select = [[makeRow({ id: 'evt-1', userId: 'test-user' })], []];
      const res = await request(app).get(`${EVENTS}/evt-1`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.event).toMatchObject({
        id: 'evt-1',
        accessRole: 'owner',
        participantStatus: null,
      });
    });

    it('marks a participant with accessRole participant and their status', async () => {
      dbState.select = [[makeRow({ id: 'evt-1', userId: 'owner' })], [{ status: 'accepted' }]];
      const res = await request(app).get(`${EVENTS}/evt-1`).set(auth);

      expect(res.status).toBe(200);
      expect(res.body.event).toMatchObject({
        accessRole: 'participant',
        participantStatus: 'accepted',
      });
    });
  });

  describe('POST /api/events', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post(EVENTS).send({ title: 'x' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post(EVENTS).set(auth).send({ title: 'only title' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/);
    });

    it('returns 400 when startDate is in the past', async () => {
      const res = await request(app)
        .post(EVENTS)
        .set(auth)
        .send({ title: 'x', startDate: '2000-01-01', endDate: '2000-01-02' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot create events in the past');
    });

    it('creates an event and returns 201 with the serialized row', async () => {
      dbState.insert = [[makeRow({ id: 'new-evt', title: 'Created' })]];
      const res = await request(app)
        .post(EVENTS)
        .set(auth)
        .send({ title: 'Created', startDate: '2031-05-01', endDate: '2031-05-02' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Event created successfully');
      expect(res.body.event).toMatchObject({ id: 'new-evt', title: 'Created' });
      expect(dbState.inserted[0]).toMatchObject({ title: 'Created', userId: 'test-user' });
    });

    it('returns 500 when the insert returns no row', async () => {
      dbState.insert = [[]];
      const res = await request(app)
        .post(EVENTS)
        .set(auth)
        .send({ title: 'x', startDate: '2031-05-01', endDate: '2031-05-02' });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Insert returned no row');
    });

    it('returns 500 when the insert throws', async () => {
      dbState.insert = [new Error('insert boom')];
      const res = await request(app)
        .post(EVENTS)
        .set(auth)
        .send({ title: 'x', startDate: '2031-05-01', endDate: '2031-05-02' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create event');
    });
  });

  describe('PUT /api/events/:id', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).put(`${EVENTS}/evt-1`).send({ title: 'x' });
      expect(res.status).toBe(401);
    });

    it('returns 404 when the event is not owned by the caller', async () => {
      dbState.select = [[]]; // no matching event
      const res = await request(app).put(`${EVENTS}/evt-1`).set(auth).send({ title: 'x' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Event not found');
    });

    it('keeps every existing field when the payload is empty (fallback branch)', async () => {
      const existing = makeRow({
        title: 'Existing',
        description: 'Existing desc',
        startTime: '08:00',
        endTime: '09:00',
        location: 'Old place',
        countryCode: 'PL',
        reminderTime: '07:00',
        isRecurring: true,
        isPublic: true,
        isPrivate: true,
        completed: true,
        priority: 'high',
        eventType: 'meeting',
        colors: ['green'],
        participants: ['a', 'b'],
        metadata: { k: 'v' },
      });
      dbState.select = [[existing]];
      dbState.update = [[existing]];

      const res = await request(app).put(`${EVENTS}/evt-1`).set(auth).send({});

      expect(res.status).toBe(200);
      // Every field falls back to the existing value (right side of ?? / ||).
      expect(dbState.updated[0]).toMatchObject({
        eventType: 'meeting',
        title: 'Existing',
        description: 'Existing desc',
        startDate: existing.startDate,
        endDate: existing.endDate,
        startTime: '08:00',
        endTime: '09:00',
        location: 'Old place',
        countryCode: 'PL',
        reminderTime: '07:00',
        isRecurring: true,
        isPublic: true,
        isPrivate: true,
        completed: true,
        priority: 'high',
        colors: ['green'],
        participants: ['a', 'b'],
        metadata: { k: 'v' },
      });
    });

    it('takes payload values for every field, incl. falsy booleans (?? left branch)', async () => {
      const existing = makeRow({
        title: 'Old',
        isPublic: true,
        isPrivate: true,
        completed: true,
        isRecurring: true,
      });
      dbState.select = [[existing]];
      dbState.update = [[existing]];

      const payload = {
        eventType: 'reminder',
        title: 'New',
        description: 'New desc',
        startDate: '2031-02-02',
        endDate: '2031-02-03',
        startTime: '12:00',
        endTime: '13:00',
        location: 'New place',
        countryCode: 'US',
        reminderTime: '11:00',
        // Explicit false must override existing true: proves ?? (not ||) semantics.
        isRecurring: false,
        isPublic: false,
        isPrivate: false,
        completed: false,
        priority: 'low',
        participants: ['x'],
        metadata: { n: 1 },
      };
      const res = await request(app).put(`${EVENTS}/evt-1`).set(auth).send(payload);

      expect(res.status).toBe(200);
      expect(dbState.updated[0]).toMatchObject({
        eventType: 'reminder',
        title: 'New',
        description: 'New desc',
        startTime: '12:00',
        location: 'New place',
        countryCode: 'US',
        reminderTime: '11:00',
        isRecurring: false,
        isPublic: false,
        isPrivate: false,
        completed: false,
        priority: 'low',
        participants: ['x'],
        metadata: { n: 1 },
      });
    });

    it('falls back to existing eventType when payload eventType is an empty string (|| branch)', async () => {
      const existing = makeRow({ eventType: 'meeting' });
      dbState.select = [[existing]];
      dbState.update = [[existing]];

      await request(app).put(`${EVENTS}/evt-1`).set(auth).send({ eventType: '' });

      expect(dbState.updated[0]).toMatchObject({ eventType: 'meeting' });
    });

    it('colors: prefers payload.colors when present', async () => {
      const existing = makeRow({ colors: ['green'] });
      dbState.select = [[existing]];
      dbState.update = [[existing]];

      await request(app)
        .put(`${EVENTS}/evt-1`)
        .set(auth)
        .send({ colors: ['red'], color: 'yellow' });

      expect(dbState.updated[0]).toMatchObject({ colors: ['red'] });
    });

    it('colors: derives [color] when only payload.color is present', async () => {
      const existing = makeRow({ colors: ['green'] });
      dbState.select = [[existing]];
      dbState.update = [[existing]];

      await request(app).put(`${EVENTS}/evt-1`).set(auth).send({ color: 'yellow' });

      expect(dbState.updated[0]).toMatchObject({ colors: ['yellow'] });
    });

    it('colors: keeps existing colors when neither colors nor color is given', async () => {
      const existing = makeRow({ colors: ['green'] });
      dbState.select = [[existing]];
      dbState.update = [[existing]];

      await request(app).put(`${EVENTS}/evt-1`).set(auth).send({ title: 'x' });

      expect(dbState.updated[0]).toMatchObject({ colors: ['green'] });
    });

    it('returns 500 when the update returns no row', async () => {
      dbState.select = [[makeRow()]];
      dbState.update = [[]];
      const res = await request(app).put(`${EVENTS}/evt-1`).set(auth).send({ title: 'x' });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Update returned no row');
    });

    it('returns 500 when the lookup throws', async () => {
      dbState.select = [new Error('update boom')];
      const res = await request(app).put(`${EVENTS}/evt-1`).set(auth).send({ title: 'x' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update event');
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete(`${EVENTS}/evt-1`);
      expect(res.status).toBe(401);
    });

    it('returns 404 when nothing was deleted', async () => {
      dbState.delete = [[]];
      const res = await request(app).delete(`${EVENTS}/evt-1`).set(auth);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Event not found');
    });

    it('deletes the event and returns its id', async () => {
      dbState.delete = [[{ id: 'evt-1' }]];
      const res = await request(app).delete(`${EVENTS}/evt-1`).set(auth);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ message: 'Event deleted successfully', id: 'evt-1' });
    });

    it('returns 500 when deletion throws', async () => {
      dbState.delete = [new Error('delete boom')];
      const res = await request(app).delete(`${EVENTS}/evt-1`).set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete event');
    });
  });
});
