import bcrypt from 'bcryptjs';
import { CryptoService } from '../security/CryptoService.js';
import {
  AuthError,
  TerminalActivationData,
  TerminalInitResult,
  LocalTerminalInfo,
  TerminalLoginResult,
  UserLoginResult,
  SessionValidationResult
} from '../types/AuthTypes.js';

export class LocalAuthService {
  private cryptoService: CryptoService;

  constructor(private localDb: any) {
    this.cryptoService = new CryptoService();
  }

  /**
   * Initialize terminal (first-time setup)
   * This would typically call central server to activate
   */
  async initializeTerminal(activationData: TerminalActivationData): Promise<TerminalInitResult> {
    try {
      // In a real implementation, this would call central server
      // For now, we'll create a basic terminal record
      // The actual activation should happen via API call to central server
      
      throw new AuthError('Terminal initialization requires central server connection. Use /api/auth/terminal/activate endpoint.');
    } catch (error) {
      throw new AuthError(`Terminal initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Terminal login (normal operation)
   * Tries central first, falls back to offline
   */
  async terminalLogin(apiKey: string, terminalInfo: LocalTerminalInfo): Promise<TerminalLoginResult> {
    try {
      // Try to find terminal locally first
      const terminal = await this.localDb.terminal.findUnique({
        where: { apiKey }
      });

      if (!terminal) {
        throw new AuthError('Terminal not found locally. Internet connection required for first-time setup.');
      }

      if (!terminal.isActive) {
        throw new AuthError('Terminal is not active');
      }

      // Verify MAC address in offline mode
      if (terminalInfo.macAddress && terminal.macAddress !== terminalInfo.macAddress) {
        throw new AuthError('Terminal hardware verification failed');
      }

      // Check if session is still valid
      if (terminal.sessionExpiry && terminal.sessionExpiry < new Date()) {
        throw new AuthError('Terminal session expired. Internet connection required.');
      }

      // Update last login
      const updatedTerminal = await this.localDb.terminal.update({
        where: { apiKey },
        data: {
          lastLoginAt: new Date(),
          ipAddress: terminalInfo.ipAddress
        }
      });

      return {
        success: true,
        terminal: updatedTerminal,
        source: 'offline',
        requiresUserLogin: true
      };
    } catch (error) {
      throw new AuthError(`Terminal login failed: ${(error as Error).message}`);
    }
  }

  /**
   * User login (local or central)
   */
  async userLogin(username: string, password: string, terminalId: string): Promise<UserLoginResult> {
    try {
      // Try local authentication first
      const user = await this.localDb.localUser?.findUnique({
        where: { username }
      }).catch(() => null);

      if (user) {
        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          throw new AuthError('Invalid password');
        }

        if (!user.isActive) {
          throw new AuthError('User account is disabled');
        }

        // Create user session
        const session = await this.createUserSession(user.id, terminalId);

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          session,
          permissions: user.permissions || [],
          source: 'offline'
        };
      }

      // If user not found locally, require central connection
      throw new AuthError('User not found. Internet connection required for authentication.');
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(`User login failed: ${(error as Error).message}`);
    }
  }

  /**
   * PIN-based quick login
   */
  async pinLogin(pinCode: string, terminalId: string): Promise<UserLoginResult> {
    try {
      const user = await this.localDb.localUser?.findUnique({
        where: { pinCode }
      }).catch(() => null);

      if (!user) {
        throw new AuthError('Invalid PIN');
      }

      if (!user.isActive) {
        throw new AuthError('User account is disabled');
      }

      // Create user session
      const session = await this.createUserSession(user.id, terminalId);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        session,
        permissions: user.permissions || [],
        source: 'pin'
      };
    } catch (error) {
      throw new AuthError(`PIN login failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create user session
   */
  private async createUserSession(userId: string, terminalId: string): Promise<any> {
    const sessionToken = this.cryptoService.generateSessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // Try to create session in local database
    // Note: This assumes a userSession model exists in the local schema
    try {
      return await this.localDb.userSession.create({
        data: {
          userId,
          terminalId,
          sessionToken,
          startedAt: new Date(),
          expiresAt,
          lastActivityAt: new Date(),
          isActive: true
        }
      });
    } catch (error) {
      // If userSession model doesn't exist, return a simple session object
      return {
        userId,
        terminalId,
        sessionToken,
        startedAt: new Date(),
        expiresAt,
        lastActivityAt: new Date(),
        isActive: true
      };
    }
  }

  /**
   * Validate user session
   */
  async validateUserSession(sessionToken: string): Promise<SessionValidationResult> {
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
      await this.localDb.userSession?.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() }
      }).catch(() => {});

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
   * Logout user
   */
  async logoutUser(sessionToken: string): Promise<void> {
    try {
      await this.localDb.userSession?.update({
        where: { sessionToken },
        data: {
          isActive: false,
          expiresAt: new Date()
        }
      }).catch(() => {});
    } catch (error) {
      // Ignore errors on logout
    }
  }
}

