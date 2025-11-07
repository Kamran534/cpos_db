import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthTokens } from '../types/AuthTypes.js';
import { SessionPayload } from '../types/SessionTypes.js';

export class TokenService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: string;
  private tokenBlacklist: Set<string> = new Set();

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  /**
   * Generate user authentication tokens
   */
  async generateUserTokens(user: any): Promise<AuthTokens> {
    const payload: SessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      storeId: user.storeId,
      type: 'user',
      sessionId: uuidv4()
    };

    const accessToken = jwt.sign(payload as object, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      jwtid: uuidv4()
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' } as object,
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 8 * 60 * 60 // 8 hours in seconds
    };
  }

  /**
   * Generate terminal authentication token
   */
  async generateTerminalToken(terminal: any): Promise<string> {
    const payload: SessionPayload = {
      terminalId: terminal.id,
      terminalCode: terminal.terminalCode,
      storeId: terminal.storeId,
      branchId: terminal.branchId,
      type: 'terminal',
      sessionId: uuidv4()
    };

    return jwt.sign(payload as object, this.JWT_SECRET, {
      expiresIn: '24h', // Terminal tokens last longer
      jwtid: uuidv4()
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<SessionPayload> {
    if (this.tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as SessionPayload;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<SessionPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as SessionPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return payload;
    } catch (error: any) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Blacklist token (logout)
   */
  async blacklistToken(token: string): Promise<void> {
    this.tokenBlacklist.add(token);
    
    // Clean up old tokens periodically (in production, use Redis with TTL)
    setTimeout(() => {
      this.tokenBlacklist.delete(token);
    }, 24 * 60 * 60 * 1000); // Remove after 24 hours
  }

  /**
   * Decode token without verification
   */
  decodeToken(token: string): SessionPayload | null {
    return jwt.decode(token) as SessionPayload | null;
  }

  /**
   * Get token expiration date
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (decoded && (decoded as any).exp) {
      return new Date((decoded as any).exp * 1000);
    }
    return null;
  }
}

