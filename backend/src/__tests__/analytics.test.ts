import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock getDb to avoid real DB connection
const mockExecute = vi.fn();

vi.mock('../db', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

// Mock authService to allow optionalAuthentication / verifyAccessToken usage
vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: 'test-user', email: 'test@example.com' }),
  },
}));

import app from '../app.js';

describe('Analytics routes', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  const auth = { Authorization: 'Bearer faketoken' };

  it('GET /api/analytics/overview returns aggregated metrics', async () => {
    // total
    mockExecute
      .mockResolvedValueOnce({ rows: [{ cnt: '10' }] })
      // last7
      .mockResolvedValueOnce({ rows: [{ cnt: '7' }] })
      // recurring
      .mockResolvedValueOnce({ rows: [{ cnt: '2' }] });

    const res = await request(app).get('/api/analytics/overview').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activeEvents');
    expect(res.body).toHaveProperty('avgPerDay');
    expect(res.body).toHaveProperty('recurringRate');
  });

  it('GET /api/analytics/trends returns series', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockExecute.mockResolvedValueOnce({ rows: [{ date: today, value: 5 }] });

    const res = await request(app).get('/api/analytics/trends?days=3').set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[2]).toEqual({ date: today, value: 5 });
    expect(res.body[0].value).toBe(0);
  });

  it('GET /api/analytics/events requires valid date and returns rows', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ id: '1', title: 'Test' }] });
    const resBad = await request(app).get('/api/analytics/events?date=bad').set(auth);
    expect(resBad.status).toBe(400);

    const res = await request(app)
      .get(`/api/analytics/events?date=${new Date().toISOString().slice(0, 10)}`)
      .set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/analytics/export returns CSV', async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: '1',
          title: 'Test',
          description: 'd',
          userId: 'u',
          eventType: 'meeting',
          startDate: 's',
          endDate: 'e',
          isRecurring: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const date = new Date().toISOString().slice(0, 10);
    const res = await request(app).get(`/api/analytics/export?date=${date}`).set(auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('id;userId;eventType;title;description');
  });

  it('GET /api/analytics/overview returns metrics when authorized', async () => {
    // total
    mockExecute
      .mockResolvedValueOnce({ rows: [{ cnt: '3' }] })
      // last7
      .mockResolvedValueOnce({ rows: [{ cnt: '1' }] })
      // recurring
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const res = await request(app).get('/api/analytics/overview').set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activeEvents');
  });

  it('GET /api/analytics/overview?dedupe=1 returns deduped counts', async () => {
    // when dedupe=1, server runs grouped queries; simulate single numeric result
    mockExecute
      .mockResolvedValueOnce({ rows: [{ cnt: '5' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '2' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: '1' }] });

    const res = await request(app).get('/api/analytics/overview?dedupe=1').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activeEvents');
  });

  it('GET /api/analytics/overview without auth returns 401', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(401);
  });

  it('POST /api/analytics/import imports rows from a valid CSV', async () => {
    // Insert resolves; the handler reports how many rows it inserted.
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const csv = [
      'title;startDate;endDate;eventType;isRecurring',
      'Standup;2026-06-01;2026-06-01;meeting;true',
      'Review;2026-06-02;2026-06-02;task;false',
    ].join('\n');

    const res = await request(app)
      .post('/api/analytics/import')
      .set(auth)
      .attach('file', Buffer.from(csv, 'utf-8'), {
        filename: 'events.csv',
        contentType: 'text/csv',
      });

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);
  });

  it('POST /api/analytics/import rejects an oversized file with 400', async () => {
    const tooBig = Buffer.alloc(2 * 1024 * 1024 + 1024, 'a');

    const res = await request(app)
      .post('/api/analytics/import')
      .set(auth)
      .attach('file', tooBig, { filename: 'big.csv', contentType: 'text/csv' });

    expect(res.status).toBe(400);
  });

  it('POST /api/analytics/import rejects a wrong MIME type with 400', async () => {
    const res = await request(app)
      .post('/api/analytics/import')
      .set(auth)
      .attach('file', Buffer.from('not a spreadsheet'), {
        filename: 'image.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
  });
});
