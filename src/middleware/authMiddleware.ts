import { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: unknown;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = (req.headers.authorization as string) || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyJwt(token) : null;
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload as unknown;
  next();
}


