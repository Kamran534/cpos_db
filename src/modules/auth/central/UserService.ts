import bcrypt from 'bcryptjs';
import { AuthError, CreateUserData, UpdateUserData } from '../types/AuthTypes.js';
import { EmailService } from '../emails/EmailService.js';

export class UserService {
  private emailService: EmailService;

  constructor(private centralDb: any) {
    this.emailService = new EmailService();
  }

  /**
   * Create new user (Admin function)
   */
  async createUser(adminUserId: string, userData: CreateUserData): Promise<any> {
    // Verify admin permissions
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser || !['SUPER_ADMIN', 'STORE_MANAGER'].includes(adminUser.role)) {
      throw new AuthError('Insufficient permissions');
    }

    // Check if username/email already exists
    const existingUser = await this.centralDb.user.findFirst({
      where: {
        OR: [
          { username: userData.username },
          { email: userData.email }
        ]
      }
    });

    if (existingUser) {
      throw new AuthError('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await this.centralDb.user.create({
      data: {
        storeId: userData.storeId,
        username: userData.username,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role,
        permissions: userData.permissions || [],
        isActive: true,
        mustChangePassword: userData.mustChangePassword || false
      },
      include: { store: true }
    });

    // Log user creation
    await this.centralDb.auditLog.create({
      data: {
        storeId: userData.storeId,
        entityType: 'User',
        entityId: user.id,
        action: 'CREATE',
        userId: adminUserId,
        changes: JSON.stringify({ ...userData, password: '***' })
      }
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user, userData.mustChangePassword ? userData.password : undefined);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail user creation if email fails
    }

    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, adminUserId: string, updates: UpdateUserData): Promise<any> {
    const user = await this.centralDb.user.findUnique({
      where: { id: userId },
      include: { store: true }
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    // Verify admin has access to this user's store
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser || adminUser.storeId !== user.storeId) {
      throw new AuthError('Access denied');
    }

    // Prepare update data
    const updateData: any = { ...updates };
    delete updateData.password;

    // Hash new password if provided
    if (updates.password) {
      updateData.passwordHash = await bcrypt.hash(updates.password, 12);
      updateData.mustChangePassword = false;
    }

    const updatedUser = await this.centralDb.user.update({
      where: { id: userId },
      data: updateData,
      include: { store: true }
    });

    // Log update
    await this.centralDb.auditLog.create({
      data: {
        storeId: user.storeId,
        entityType: 'User',
        entityId: userId,
        action: 'UPDATE',
        userId: adminUserId,
        changes: JSON.stringify({ ...updates, password: updates.password ? '***' : undefined })
      }
    });

    return updatedUser;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.centralDb.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await this.centralDb.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        lastPasswordChange: new Date()
      }
    });

    // Log password change
    await this.centralDb.auditLog.create({
      data: {
        storeId: user.storeId,
        entityType: 'User',
        entityId: userId,
        action: 'UPDATE',
        userId: userId,
        changes: JSON.stringify({ passwordChanged: true })
      }
    });

    // Send password changed notification email
    try {
      await this.emailService.sendPasswordChangedEmail(user);
    } catch (error) {
      console.error('Failed to send password changed email:', error);
    }
  }

  /**
   * Reset user password (Admin function)
   */
  async resetPassword(userId: string, adminUserId: string, newPassword: string): Promise<void> {
    const user = await this.centralDb.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    // Verify admin permissions
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser || adminUser.storeId !== user.storeId) {
      throw new AuthError('Access denied');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.centralDb.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        loginAttempts: 0,
        lockedUntil: null
      }
    });

    // Log password reset
    await this.centralDb.auditLog.create({
      data: {
        storeId: user.storeId,
        entityType: 'User',
        entityId: userId,
        action: 'UPDATE',
        userId: adminUserId,
        changes: JSON.stringify({ passwordReset: true })
      }
    });

    // Send welcome email with new temporary password
    try {
      const updatedUser = await this.centralDb.user.findUnique({
        where: { id: userId },
        include: { store: true }
      });
      await this.emailService.sendWelcomeEmail(updatedUser, newPassword);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  /**
   * Request password reset (generates reset token)
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.centralDb.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists for security
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    }

    // Generate reset token (using CryptoService for secure token)
    const { CryptoService } = await import('../security/CryptoService.js');
    const cryptoService = new CryptoService();
    const resetToken = cryptoService.generateSessionToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token (you might want to add a passwordResetToken field to User model)
    // For now, we'll just send the email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`;

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user, resetToken, resetUrl);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }

  /**
   * Create initial super admin (setup only - works only if no super admin exists)
   */
  async createInitialSuperAdmin(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<any> {
    // Check if any super admin already exists
    const existingSuperAdmin = await this.centralDb.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin) {
      throw new AuthError('Super admin already exists. Use regular user creation instead.');
    }

    // Check if username/email already exists
    const existingUser = await this.centralDb.user.findFirst({
      where: {
        OR: [
          { username: userData.username },
          { email: userData.email }
        ]
      }
    });

    if (existingUser) {
      throw new AuthError('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create super admin (no storeId required for super admin)
    const superAdmin = await this.centralDb.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: 'SUPER_ADMIN',
        permissions: [], // Super admin has all permissions by default
        isActive: true,
        mustChangePassword: false
      }
    });

    // Log super admin creation
    await this.centralDb.auditLog.create({
      data: {
        entityType: 'User',
        entityId: superAdmin.id,
        action: 'CREATE',
        userId: superAdmin.id, // Self-created
        changes: JSON.stringify({ ...userData, password: '***', role: 'SUPER_ADMIN' })
      }
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(superAdmin);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return superAdmin;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    return await this.centralDb.user.findUnique({
      where: { id: userId },
      include: { store: true }
    });
  }

  /**
   * List users for store
   */
  async listUsers(storeId: string, adminUserId: string): Promise<{ users: any[]; totalCount: number }> {
    // Verify user has access to this store
    const user = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    // SUPER_ADMIN can access any store, STORE_MANAGER only their own
    if (user.role !== 'SUPER_ADMIN' && user.storeId !== storeId) {
      throw new AuthError('Access denied');
    }

    // Verify store exists
    const store = await this.centralDb.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw new AuthError('Store not found');
    }

    // Get users and count in parallel
    const [users, totalCount] = await Promise.all([
      this.centralDb.user.findMany({
        where: { storeId },
        include: { store: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.centralDb.user.count({
        where: { storeId }
      })
    ]);

    return {
      users,
      totalCount
    };
  }
}

