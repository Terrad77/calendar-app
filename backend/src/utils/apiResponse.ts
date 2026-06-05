import type { Response } from 'express';

export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
};

export const sendApiResponse = <T>(
  res: Response,
  statusCode: number,
  data: T,
  meta?: Record<string, unknown>
): Response => {
  const payload: ApiEnvelope<T> = { data };

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const sendApiError = (
  res: Response,
  statusCode: number,
  error: string,
  meta?: Record<string, unknown>
): Response => {
  const payload: ApiEnvelope<null> = {
    data: null,
    error,
  };

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};
