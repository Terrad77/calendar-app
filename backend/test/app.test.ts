import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Backend basic routes', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'Calendar AI Assistant' });
  });

  it('GET /api/ai/health returns AI status', async () => {
    const res = await request(app).get('/api/ai/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service');
    expect(res.body).toHaveProperty('available');
  });

  it('GET /api/auth/google returns redirect or config error', async () => {
    const res = await request(app).get('/api/auth/google');
    expect([302, 503]).toContain(res.status);
  });
});
