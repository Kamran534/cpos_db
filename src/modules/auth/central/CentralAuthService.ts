import bcrypt from 'bcryptjs';
import { TokenService } from '../security/TokenService.js';
import { CryptoService } from '../security/CryptoService.js';
import { AuditService } from './AuditService.js';
import { PermissionService } from './PermissionService.js';
import { EmailService } from '../emails/EmailService.js';
import {
  AuthError,
  AdminLoginResult,
  TerminalAuthResult,
  TerminalActivationResult,
  TokenRefreshResult,
  TerminalInfo,
  AuthTokens
} from '../types/AuthTypes.js';

export class CentralAuthService {
  private tokenService: TokenService;
  private cryptoService: CryptoService;
  private auditService: AuditService;
  private permissionService: PermissionService;
  private emailService: EmailService;

  constructor(private centralDb: any) {
    this.tokenService = new TokenService();
    this.cryptoService = new CryptoService();
    this.auditService = new AuditService(centralDb);
    this.permissionService = new PermissionService(centralDb);
    this.emailService = new EmailService();
  }

  /**
   * Admin user login
   */
  async adminLogin(
    username: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AdminLoginResult> {
    try {
      // Find user
      const user = await this.centralDb.user.findUnique({
        where: { username },
        include: { store: true }
      });

      if (!user) {
        await this.auditService.logAuthFailure(username, 'USER_NOT_FOUND', ipAddress, userAgent);
        throw new AuthError('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        await this.auditService.logAuthFailure(username, 'USER_INACTIVE', ipAddress, userAgent);
        throw new AuthError('Account is disabled');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.auditService.logAuthFailure(username, 'ACCOUNT_LOCKED', ipAddress, userAgent);
        // Send account locked email if not already sent recently
        try {
          await this.emailService.sendAccountLockedEmail(user, user.lockedUntil);
        } catch (error) {
          console.error('Failed to send account locked email:', error);
        }
        throw new AuthError(`Account locked until ${user.lockedUntil.toLocaleString()}`);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Increment login attempts
        const updatedUser = await this.centralDb.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: { increment: 1 },
            lockedUntil: user.loginAttempts + 1 >= 5 
              ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
              : null
          }
        });

        await this.auditService.logAuthFailure(username, 'INVALID_PASSWORD', ipAddress, userAgent);
        throw new AuthError('Invalid credentials');
      }

      // Reset login attempts on successful login
      await this.centralDb.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date()
        }
      });

      // Generate tokens
      const tokens = await this.tokenService.generateUserTokens(user);
      
      // Get user permissions
      const permissions = await this.permissionService.getUserPermissions(user.id);

      // Log successful login
      await this.auditService.logAuthSuccess(user.id, 'ADMIN_LOGIN', ipAddress, userAgent);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          store: user.store
        },
        tokens,
        permissions
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      await this.auditService.logAuthFailure(username, 'SYSTEM_ERROR', ipAddress, userAgent);
      throw new AuthError('Authentication failed');
    }
  }

  /**
   * Terminal authentication
   */
  async authenticateTerminal(apiKey: string, terminalInfo: TerminalInfo): Promise<TerminalAuthResult> {
    try {
      // Find terminal by API key
      const terminal = await this.centralDb.terminal.findUnique({
        where: { apiKey },
        include: {
          store: true,
          branch: true,
          location: true
        }
      });

      if (!terminal) {
        await this.auditService.logTerminalAuthFailure(apiKey, 'INVALID_API_KEY', terminalInfo.ipAddress);
        throw new AuthError('Invalid terminal credentials');
      }

      // Check terminal status
      if (!terminal.isActive) {
        await this.auditService.logTerminalAuthFailure(terminal.id, 'TERMINAL_INACTIVE', terminalInfo.ipAddress);
        throw new AuthError('Terminal is not active');
      }

      // Verify MAC address if provided
      if (terminalInfo.macAddress && terminal.macAddress !== terminalInfo.macAddress) {
        await this.auditService.logTerminalAuthFailure(terminal.id, 'MAC_ADDRESS_MISMATCH', terminalInfo.ipAddress);
        throw new AuthError('Terminal hardware verification failed');
      }

      // Update terminal status
      await this.centralDb.terminal.update({
        where: { id: terminal.id },
        data: {
          status: 'ONLINE',
          lastHeartbeat: new Date(),
          ipAddress: terminalInfo.ipAddress
        }
      });

      // Generate terminal token
      const token = await this.tokenService.generateTerminalToken(terminal);

      // Log successful terminal auth
      await this.auditService.logTerminalAuthSuccess(terminal.id, terminalInfo.ipAddress);

      return {
        success: true,
        terminal: {
          id: terminal.id,
          terminalCode: terminal.terminalCode,
          terminalName: terminal.terminalName,
          store: terminal.store,
          branch: terminal.branch,
          location: terminal.location,
          features: terminal.features
        },
        token
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      await this.auditService.logTerminalAuthFailure(apiKey, 'SYSTEM_ERROR', terminalInfo.ipAddress);
      throw new AuthError('Terminal authentication failed');
    }
  }

  /**
   * Terminal activation (first-time setup)
   */
  async activateTerminal(activationCode: string, terminalInfo: TerminalInfo): Promise<TerminalActivationResult> {
    try {
      // Find activation record
      const activation = await this.centralDb.terminalActivation.findUnique({
        where: { activationCode },
        include: { terminal: true }
      });

      if (!activation) {
        throw new AuthError('Invalid activation code');
      }

      // Check if already activated
      if (activation.activatedAt) {
        throw new AuthError('Activation code already used');
      }

      // Check expiration
      if (activation.expiresAt < new Date()) {
        throw new AuthError('Activation code expired');
      }

      // Verify terminal hardware
      if (activation.terminal.macAddress !== terminalInfo.macAddress) {
        throw new AuthError('Terminal hardware mismatch');
      }

      // Activate terminal
      const updatedTerminal = await this.centralDb.terminal.update({
        where: { id: activation.terminalId },
        data: {
          isActive: true,
          status: 'ONLINE',
          lastActivatedAt: new Date(),
          lastHeartbeat: new Date(),
          ipAddress: terminalInfo.ipAddress
        },
        include: {
          store: true,
          branch: true,
          location: true
        }
      });

      // Mark activation as used
      await this.centralDb.terminalActivation.update({
        where: { id: activation.id },
        data: {
          activatedAt: new Date(),
          activatedBy: terminalInfo.macAddress
        }
      });

      // Generate tokens
      const token = await this.tokenService.generateTerminalToken(updatedTerminal);

      // Log activation
      await this.auditService.logTerminalActivation(updatedTerminal.id, terminalInfo.ipAddress);

      // Send terminal activated notification email
      try {
        const adminUser = await this.centralDb.user.findFirst({
          where: {
            storeId: updatedTerminal.storeId,
            role: { in: ['SUPER_ADMIN', 'STORE_MANAGER'] }
          },
          select: { email: true }
        });

        if (adminUser?.email) {
          await this.emailService.sendTerminalActivatedEmail(adminUser.email, {
            terminalCode: updatedTerminal.terminalCode,
            terminalName: updatedTerminal.terminalName,
            activatedAt: new Date(),
            storeName: updatedTerminal.store.storeName,
            branchName: updatedTerminal.branch.branchName
          });
        }
      } catch (error) {
        console.error('Failed to send terminal activated email:', error);
      }

      return {
        success: true,
        terminal: {
          id: updatedTerminal.id,
          terminalCode: updatedTerminal.terminalCode,
          terminalName: updatedTerminal.terminalName,
          apiKey: updatedTerminal.apiKey,
          store: updatedTerminal.store,
          branch: updatedTerminal.branch,
          location: updatedTerminal.location,
          features: updatedTerminal.features
        },
        token
      };
    } catch (error) {
      await this.auditService.logTerminalActivationFailure(activationCode, (error as Error).message, terminalInfo.ipAddress);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      
      if (payload.type === 'refresh' && payload.userId) {
        const user = await this.centralDb.user.findUnique({
          where: { id: payload.userId },
          include: { store: true }
        });

        if (!user || !user.isActive) {
          throw new AuthError('User not found or inactive');
        }

        const tokens = await this.tokenService.generateUserTokens(user);
        return { success: true, tokens, type: 'user' };
      
      } else if (payload.type === 'refresh' && payload.terminalId) {
        const terminal = await this.centralDb.terminal.findUnique({
          where: { id: payload.terminalId },
          include: { store: true, branch: true }
        });

        if (!terminal || !terminal.isActive) {
          throw new AuthError('Terminal not found or inactive');
        }

        const token = await this.tokenService.generateTerminalToken(terminal);
        return { success: true, token, type: 'terminal' };
      
      } else {
        throw new AuthError('Invalid token type');
      }
    } catch (error) {
      throw new AuthError('Token refresh failed');
    }
  }

  /**
   * Logout
   */
  async logout(userId: string, token: string): Promise<void> {
    // Add token to blacklist
    await this.tokenService.blacklistToken(token);
    
    // Log logout event
    await this.auditService.logLogout(userId);
  }
}

