import jwt from 'jsonwebtoken';

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

export function signJwt(payload: string | object | Buffer, options: jwt.SignOptions = {}) {
  return jwt.sign(payload as any, JWT_SECRET as any, { ...options, expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions) as string;
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (_e) {
    return null;
  }
}


