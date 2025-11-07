import { EntitySyncStrategy } from './EntitySyncStrategy.js';

export class CustomerSyncStrategy extends EntitySyncStrategy {
  constructor(localDb: any, centralApi: any) {
    super('Customer', localDb, centralApi);
  }

  async shouldSync(localEntity: any, centralEntity: any): Promise<boolean> {
    // Sync customer changes - important for loyalty and credit
    return true;
  }

  async mergeChanges(localData: any, centralData: any): Promise<any> {
    // Merge customer data - prefer central for master data, local for recent transactions
    return {
      ...centralData,
      // Preserve local loyalty points and spending if more recent
      loyaltyPoints: Math.max(localData.loyaltyPoints || 0, centralData.loyaltyPoints || 0),
      totalSpent: Math.max(localData.totalSpent || 0, centralData.totalSpent || 0),
      totalOrders: Math.max(localData.totalOrders || 0, centralData.totalOrders || 0)
    };
  }

  getSyncPriority(entity: any): number {
    // Customers are high priority
    return 7;
  }
}

