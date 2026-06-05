import { Request, Response, NextFunction } from 'express';

// Standardized error response interface
interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const errorName = err.name || 'InternalServerError';

  res.status(statusCode).json({
    error: errorName,
    message: err.message || 'Internal server error',
  });
};
