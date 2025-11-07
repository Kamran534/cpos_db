import { AuthError } from '../types/AuthTypes.js';

export class AuditService {
  constructor(private centralDb: any) {}

  /**
   * Log successful authentication
   */
  async logAuthSuccess(userId: string, authType: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      const user = await this.centralDb.user.findUnique({
        where: { id: userId },
        select: { storeId: true }
      });

      await this.centralDb.auditLog.create({
        data: {
          storeId: user?.storeId || null, // Use null instead of empty string for super admin
          entityType: 'User',
          entityId: userId,
          action: 'LOGIN', // Use valid AuditAction enum value
          userId: userId,
          changes: JSON.stringify({
            authType,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
          })
        }
      });
    } catch (error) {
      console.error('Failed to log auth success:', error);
    }
  }

  /**
   * Log authentication failure
   */
  async logAuthFailure(identifier: string, reason: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      await this.centralDb.auditLog.create({
        data: {
          storeId: null, // Use null for system-level operations
          entityType: 'Auth',
          entityId: identifier,
          action: 'LOGIN', // Use valid AuditAction enum value (LOGIN for auth attempts)
          userId: null,
          changes: JSON.stringify({
            identifier,
            reason,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString(),
            success: false
          })
        }
      });
    } catch (error) {
      console.error('Failed to log auth failure:', error);
    }
  }

  /**
   * Log terminal authentication success
   */
  async logTerminalAuthSuccess(terminalId: string, ipAddress: string): Promise<void> {
    try {
      const terminal = await this.centralDb.terminal.findUnique({
        where: { id: terminalId },
        select: { storeId: true }
      });

      await this.centralDb.auditLog.create({
        data: {
          storeId: terminal?.storeId || null,
          entityType: 'Terminal',
          entityId: terminalId,
          action: 'LOGIN', // Use valid AuditAction enum value
          userId: null,
          changes: JSON.stringify({
            ipAddress,
            timestamp: new Date().toISOString(),
            authType: 'TERMINAL'
          })
        }
      });
    } catch (error) {
      console.error('Failed to log terminal auth success:', error);
    }
  }

  /**
   * Log terminal authentication failure
   */
  async logTerminalAuthFailure(identifier: string, reason: string, ipAddress: string): Promise<void> {
    try {
      await this.centralDb.auditLog.create({
        data: {
          storeId: null, // Use null for system-level operations
          entityType: 'Terminal',
          entityId: identifier,
          action: 'LOGIN', // Use valid AuditAction enum value
          userId: null,
          changes: JSON.stringify({
            identifier,
            reason,
            ipAddress,
            timestamp: new Date().toISOString(),
            success: false,
            authType: 'TERMINAL'
          })
        }
      });
    } catch (error) {
      console.error('Failed to log terminal auth failure:', error);
    }
  }

  /**
   * Log terminal activation
   */
  async logTerminalActivation(terminalId: string, ipAddress: string): Promise<void> {
    try {
      const terminal = await this.centralDb.terminal.findUnique({
        where: { id: terminalId },
        select: { storeId: true }
      });

      await this.centralDb.auditLog.create({
        data: {
          storeId: terminal?.storeId || null,
          entityType: 'Terminal',
          entityId: terminalId,
          action: 'CREATE', // Use valid AuditAction enum value
          userId: null,
          changes: JSON.stringify({
            ipAddress,
            timestamp: new Date().toISOString(),
            action: 'TERMINAL_ACTIVATION'
          })
        }
      });
    } catch (error) {
      console.error('Failed to log terminal activation:', error);
    }
  }

  /**
   * Log terminal activation failure
   */
  async logTerminalActivationFailure(activationCode: string, error: string, ipAddress: string): Promise<void> {
    try {
      await this.centralDb.auditLog.create({
        data: {
          storeId: null, // Use null for system-level operations
          entityType: 'Terminal',
          entityId: activationCode,
          action: 'CREATE', // Use valid AuditAction enum value
          userId: null,
          changes: JSON.stringify({
            activationCode,
            error,
            ipAddress,
            timestamp: new Date().toISOString(),
            success: false,
            action: 'TERMINAL_ACTIVATION_FAILURE'
          })
        }
      });
    } catch (err) {
      console.error('Failed to log terminal activation failure:', err);
    }
  }

  /**
   * Log logout
   */
  async logLogout(userId: string): Promise<void> {
    try {
      const user = await this.centralDb.user.findUnique({
        where: { id: userId },
        select: { storeId: true }
      });

      await this.centralDb.auditLog.create({
        data: {
          storeId: user?.storeId || null, // Use null instead of empty string for super admin
          entityType: 'User',
          entityId: userId,
          action: 'LOGOUT',
          userId: userId,
          changes: JSON.stringify({
            timestamp: new Date().toISOString()
          })
        }
      });
    } catch (error) {
      console.error('Failed to log logout:', error);
    }
  }
}

