import request from 'supertest';
import ExcelJS from 'exceljs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Covers the analytics import edge cases, /month-pulse and the dev-only
// /debug endpoints that the existing analytics.test.ts does not reach. Uses
// the same raw-SQL execute mock pattern.
const mockExecute = vi.fn();

vi.mock('../db', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAccessToken: (_token: string) => ({ userId: 'test-user', email: 'test@example.com' }),
  },
}));

import app from '../app.js';

const auth = { Authorization: 'Bearer faketoken' };
const csvFile = (content: string) => Buffer.from(content, 'utf-8');

describe('Analytics import / pulse / debug', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockExecute.mockResolvedValue({ rows: [] });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('POST /api/analytics/import edge cases', () => {
    it('returns 400 when no file is attached', async () => {
      const res = await request(app).post('/api/analytics/import').set(auth);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('imports rows from an XLSX upload', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet1');
      ws.addRow(['title', 'startDate', 'endDate', 'eventType', 'isRecurring']);
      ws.addRow(['Xlsx Event', '2026-06-01', '2026-06-01', 'meeting', 'true']);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());

      const res = await request(app)
        .post('/api/analytics/import')
        .set(auth)
        .attach('file', buffer, {
          filename: 'events.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(1);
    });

    it('truncates to the first 500 rows and warns', async () => {
      const header = 'title;startDate;endDate;eventType;isRecurring';
      const rows = Array.from(
        { length: 501 },
        (_, i) => `Event ${i};2026-06-01;2026-06-01;task;false`
      );
      const res = await request(app)
        .post('/api/analytics/import')
        .set(auth)
        .attach('file', csvFile([header, ...rows].join('\n')), {
          filename: 'big.csv',
          contentType: 'text/csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(500);
      expect(res.body.warnings).toContain('Only the first 500 rows were imported');
    });

    it('skips a row with no title', async () => {
      const csv = ['title;startDate', ';2026-06-01'].join('\n');
      const res = await request(app)
        .post('/api/analytics/import')
        .set(auth)
        .attach('file', csvFile(csv), { filename: 'e.csv', contentType: 'text/csv' });

      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(0);
      expect(res.body.skipped).toBe(1);
    });

    it('skips a row with an invalid startDate and warns', async () => {
      const csv = ['title;startDate', 'Bad Start;not-a-date'].join('\n');
      const res = await request(app)
        .post('/api/analytics/import')
        .set(auth)
        .attach('file', csvFile(csv), { filename: 'e.csv', contentType: 'text/csv' });

      expect(res.status).toBe(200);
      expect(res.body.skipped).toBe(1);
      expect(res.body.warnings).toContain('Skipped "Bad Start": invalid startDate');
    });

    it('skips a row with an invalid endDate and warns', async () => {
      const csv = ['title;startDate;endDate', 'Bad End;2026-06-01;not-a-date'].join('\n');
      const res = await request(app)
        .post('/api/analytics/import')
        .set(auth)
        .attach('file', csvFile(csv), { filename: 'e.csv', contentType: 'text/csv' });

      expect(res.status).toBe(200);
      expect(res.body.skipped).toBe(1);
      expect(res.body.warnings).toContain('Skipped "Bad End": invalid endDate');
    });

    it('returns 500 when the insert fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExecute.mockRejectedValueOnce(new Error('insert failed'));
      const csv = ['title;startDate;endDate', 'Standup;2026-06-01;2026-06-01'].join('\n');

      const res = await request(app)
        .post('/api/analytics/import')
        .set(auth)
        .attach('file', csvFile(csv), { filename: 'e.csv', contentType: 'text/csv' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to import events');
    });
  });

  describe('GET /api/analytics/month-pulse', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/analytics/month-pulse');
      expect(res.status).toBe(401);
    });

    it('returns a per-day series for the current month', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ day: 5, value: 3 }] });
      const res = await request(app).get('/api/analytics/month-pulse').set(auth);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Day 5 carries the queried value; every other day defaults to 0.
      const dayFive = res.body.find((d: { day: number }) => d.day === 5);
      expect(dayFive).toEqual({ day: 5, value: 3 });
      expect(res.body[0]).toEqual({ day: 1, value: 0 });
    });

    it('returns 500 when the query fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExecute.mockRejectedValueOnce(new Error('pulse failed'));
      const res = await request(app).get('/api/analytics/month-pulse').set(auth);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get month pulse data');
    });
  });

  describe('GET /api/analytics/debug (dev-only)', () => {
    it('/debug/all dumps events', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: '1', title: 'X' }] });
      const res = await request(app).get('/api/analytics/debug/all');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 1 });
      expect(res.body.rows).toHaveLength(1);
    });

    it('/debug/all returns 500 on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExecute.mockRejectedValueOnce(new Error('dump failed'));
      const res = await request(app).get('/api/analytics/debug/all');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to dump events');
    });

    it('/debug/counts-by-user returns grouped counts', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ userId: 'u1', cnt: '4' }] });
      const res = await request(app).get('/api/analytics/debug/counts-by-user');
      expect(res.status).toBe(200);
      expect(res.body.rows).toEqual([{ userId: 'u1', cnt: '4' }]);
    });

    it('/debug/counts-by-user returns 500 on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExecute.mockRejectedValueOnce(new Error('counts failed'));
      const res = await request(app).get('/api/analytics/debug/counts-by-user');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to get counts');
    });
  });
});
