import { NextFunction, Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ error: 'Not Found' });
}

interface ApiError extends Error {
  status?: number;
  code?: string;
  context?: unknown;
}

export function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected error';
  const context = err.context;
  res.status(status).json({ error: { code, message, context } });
}


