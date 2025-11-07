import { CryptoService } from '../security/CryptoService.js';
import { SessionValidationResult } from '../types/AuthTypes.js';

export class UserSessionService {
  private cryptoService: CryptoService;

  constructor(private localDb: any) {
    this.cryptoService = new CryptoService();
  }

  /**
   * Create new user session
   */
  async createSession(userId: string, terminalId: string, ipAddress?: string, userAgent?: string): Promise<any> {
    const sessionToken = this.cryptoService.generateSessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    try {
      return await this.localDb.userSession.create({
        data: {
          userId,
          terminalId,
          sessionToken,
          startedAt: new Date(),
          expiresAt,
          lastActivityAt: new Date(),
          isActive: true,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      // Fallback if model doesn't exist
      return {
        userId,
        terminalId,
        sessionToken,
        startedAt: new Date(),
        expiresAt,
        lastActivityAt: new Date(),
        isActive: true,
        ipAddress,
        userAgent
      };
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    try {
      const session = await this.localDb.userSession?.findUnique({
        where: { sessionToken },
        include: {
          user: true,
          terminal: true
        }
      }).catch(() => null);

      if (!session) {
        return { valid: false, reason: 'SESSION_NOT_FOUND' };
      }

      if (!session.isActive) {
        return { valid: false, reason: 'SESSION_INACTIVE' };
      }

      if (session.expiresAt < new Date()) {
        return { valid: false, reason: 'SESSION_EXPIRED' };
      }

      // Update last activity
      await this.updateLastActivity(session.id);

      return {
        valid: true,
        session,
        user: session.user,
        terminal: session.terminal
      };
    } catch (error) {
      return { valid: false, reason: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await this.localDb.userSession?.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() }
      }).catch(() => {});
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(sessionToken: string): Promise<void> {
    try {
      await this.localDb.userSession?.update({
        where: { sessionToken },
        data: {
          isActive: false,
          expiresAt: new Date()
        }
      }).catch(() => {});
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      return await this.localDb.userSession?.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: {
          terminal: true
        },
        orderBy: { lastActivityAt: 'desc' }
      }).catch(() => []);
    } catch (error) {
      return [];
    }
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await this.localDb.userSession?.updateMany({
        where: { userId, isActive: true },
        data: {
          isActive: false,
          expiresAt: new Date()
        }
      }).catch(() => {});
    } catch (error) {
      // Ignore errors
    }
  }
}

