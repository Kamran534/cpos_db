import { v4 as uuidv4 } from 'uuid';
import { AuthError, StoreRegistrationData } from '../types/AuthTypes.js';
import { EmailService } from '../emails/EmailService.js';

export class StoreRegistrationService {
  private emailService: EmailService;

  constructor(private centralDb: any) {
    this.emailService = new EmailService();
  }

  /**
   * Register new store (Super Admin function)
   */
  async registerStore(adminUserId: string, storeData: StoreRegistrationData): Promise<any> {
    // Verify admin is super admin
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthError('Only super admins can register stores');
    }

    // Check if store code already exists
    const existingStore = await this.centralDb.store.findUnique({
      where: { storeCode: storeData.storeCode }
    });

    if (existingStore) {
      throw new AuthError('Store code already exists');
    }

    // Create store
    const store = await this.centralDb.store.create({
      data: {
        id: uuidv4(),
        storeCode: storeData.storeCode,
        storeName: storeData.storeName,
        legalName: storeData.legalName,
        taxId: storeData.taxId,
        email: storeData.email,
        phone: storeData.phone,
        addressLine1: storeData.addressLine1,
        addressLine2: storeData.addressLine2,
        city: storeData.city,
        state: storeData.state,
        zipCode: storeData.zipCode,
        country: storeData.country || 'US',
        timezone: storeData.timezone || 'UTC',
        defaultCurrency: storeData.defaultCurrency || 'USD',
        defaultLanguage: storeData.defaultLanguage || 'en',
        subscriptionTier: storeData.subscriptionTier || 'STANDARD',
        isActive: true
      }
    });

    // Log store creation
    await this.centralDb.auditLog.create({
      data: {
        storeId: store.id,
        entityType: 'Store',
        entityId: store.id,
        action: 'CREATE',
        userId: adminUserId,
        changes: JSON.stringify(storeData)
      }
    });

    // Send registration email if email is provided
    if (storeData.email) {
      try {
        const adminUser = await this.centralDb.user.findUnique({
          where: { id: adminUserId },
          select: { firstName: true, lastName: true, username: true }
        });

        const registeredBy = adminUser
          ? `${adminUser.firstName} ${adminUser.lastName} (${adminUser.username})`
          : 'System Administrator';

        await this.emailService.sendStoreRegistrationEmail(storeData.email, {
          storeName: store.storeName,
          storeCode: store.storeCode,
          registeredBy,
          registeredAt: store.createdAt,
          addressLine1: storeData.addressLine1,
          city: storeData.city,
          state: storeData.state,
          zipCode: storeData.zipCode,
          phone: storeData.phone
        });
      } catch (error) {
        console.error('Failed to send store registration email:', error);
        // Don't fail store creation if email fails
      }
    }

    return store;
  }

  /**
   * Update store
   */
  async updateStore(storeId: string, adminUserId: string, updates: Partial<StoreRegistrationData>): Promise<any> {
    // Verify admin permissions
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser) {
      throw new AuthError('User not found');
    }

    // Super admin can update any store, store manager can only update their store
    if (adminUser.role !== 'SUPER_ADMIN' && adminUser.storeId !== storeId) {
      throw new AuthError('Access denied');
    }

    const store = await this.centralDb.store.update({
      where: { id: storeId },
      data: updates
    });

    // Log update
    await this.centralDb.auditLog.create({
      data: {
        storeId: storeId,
        entityType: 'Store',
        entityId: storeId,
        action: 'UPDATE',
        userId: adminUserId,
        changes: JSON.stringify(updates)
      }
    });

    return store;
  }

  /**
   * Get store by ID
   */
  async getStore(storeId: string): Promise<any> {
    return await this.centralDb.store.findUnique({
      where: { id: storeId },
      include: {
        branches: true,
        _count: {
          select: {
            users: true,
            terminals: true,
            products: true
          }
        }
      }
    });
  }

  /**
   * List all stores (Super Admin only)
   */
  async listStores(adminUserId: string): Promise<any[]> {
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') {
      throw new AuthError('Only super admins can list all stores');
    }

    return await this.centralDb.store.findMany({
      include: {
        _count: {
          select: {
            branches: true,
            users: true,
            terminals: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

