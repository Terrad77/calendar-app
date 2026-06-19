import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/errorHandler.js';

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

const req = {} as Request;
const next = (() => undefined) as NextFunction;

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the error statusCode, name and message when present', () => {
    const err = Object.assign(new Error('Resource missing'), {
      name: 'NotFoundError',
      statusCode: 404,
    });
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'NotFoundError', message: 'Resource missing' });
  });

  it('defaults to 500 when the error has no statusCode', () => {
    const err = new Error('boom'); // name 'Error', no statusCode
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Error', message: 'boom' });
  });

  it('falls back to default name and message when both are empty', () => {
    const err = Object.assign(new Error(''), { name: '' });
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: 'InternalServerError',
      message: 'Internal server error',
    });
  });
});
