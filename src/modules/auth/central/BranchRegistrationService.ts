import { v4 as uuidv4 } from 'uuid';
import { AuthError, BranchRegistrationData } from '../types/AuthTypes.js';

export class BranchRegistrationService {
  constructor(private centralDb: any) {}

  /**
   * Register new branch (Admin function)
   */
  async registerBranch(adminUserId: string, branchData: BranchRegistrationData): Promise<any> {
    // Verify admin permissions
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser || !['SUPER_ADMIN', 'STORE_MANAGER'].includes(adminUser.role)) {
      throw new AuthError('Insufficient permissions');
    }

    // Verify store access
    if (adminUser.role !== 'SUPER_ADMIN' && adminUser.storeId !== branchData.storeId) {
      throw new AuthError('Access denied to this store');
    }

    // Check if branch code already exists
    const existingBranch = await this.centralDb.branch.findUnique({
      where: { branchCode: branchData.branchCode }
    });

    if (existingBranch) {
      throw new AuthError('Branch code already exists');
    }

    // Verify store exists
    const store = await this.centralDb.store.findUnique({
      where: { id: branchData.storeId }
    });

    if (!store) {
      throw new AuthError('Store not found');
    }

    // Create branch
    const branch = await this.centralDb.branch.create({
      data: {
        id: uuidv4(),
        storeId: branchData.storeId,
        branchCode: branchData.branchCode,
        branchName: branchData.branchName,
        email: branchData.email,
        phone: branchData.phone,
        addressLine1: branchData.addressLine1,
        addressLine2: branchData.addressLine2,
        city: branchData.city,
        state: branchData.state,
        zipCode: branchData.zipCode,
        country: branchData.country || 'US',
        timezone: branchData.timezone || store.timezone || 'UTC',
        currency: branchData.currency || store.defaultCurrency || 'USD',
        taxRate: branchData.taxRate || 0,
        managerId: branchData.managerId,
        syncEnabled: true,
        syncInterval: 300,
        isActive: true
      },
      include: {
        store: true
      }
    });

    // Log branch creation
    await this.centralDb.auditLog.create({
      data: {
        storeId: branchData.storeId,
        entityType: 'Branch',
        entityId: branch.id,
        action: 'CREATE',
        userId: adminUserId,
        changes: JSON.stringify(branchData)
      }
    });

    return branch;
  }

  /**
   * Update branch
   */
  async updateBranch(branchId: string, adminUserId: string, updates: Partial<BranchRegistrationData>): Promise<any> {
    const branch = await this.centralDb.branch.findUnique({
      where: { id: branchId },
      include: { store: true }
    });

    if (!branch) {
      throw new AuthError('Branch not found');
    }

    // Verify admin has access to this branch's store
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser) {
      throw new AuthError('User not found');
    }

    if (adminUser.role !== 'SUPER_ADMIN' && adminUser.storeId !== branch.storeId) {
      throw new AuthError('Access denied');
    }

    const updatedBranch = await this.centralDb.branch.update({
      where: { id: branchId },
      data: updates,
      include: { store: true }
    });

    // Log update
    await this.centralDb.auditLog.create({
      data: {
        storeId: branch.storeId,
        entityType: 'Branch',
        entityId: branchId,
        action: 'UPDATE',
        userId: adminUserId,
        changes: JSON.stringify(updates)
      }
    });

    return updatedBranch;
  }

  /**
   * Get branch by ID
   */
  async getBranch(branchId: string): Promise<any> {
    return await this.centralDb.branch.findUnique({
      where: { id: branchId },
      include: {
        store: true,
        locations: true,
        _count: {
          select: {
            terminals: true,
            locations: true
          }
        }
      }
    });
  }

  /**
   * List branches for store
   */
  async listBranches(storeId: string, adminUserId: string): Promise<any[]> {
    // Verify user has access to this store
    const user = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    if (user.role !== 'SUPER_ADMIN' && user.storeId !== storeId) {
      throw new AuthError('Access denied');
    }

    return await this.centralDb.branch.findMany({
      where: { storeId },
      include: {
        store: true,
        _count: {
          select: {
            terminals: true,
            locations: true
          }
        }
      },
      orderBy: { branchCode: 'asc' }
    });
  }
}

