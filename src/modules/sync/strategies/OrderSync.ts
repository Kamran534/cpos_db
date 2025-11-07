import { EntitySyncStrategy } from './EntitySyncStrategy.js';

export class OrderSyncStrategy extends EntitySyncStrategy {
  constructor(localDb: any, centralApi: any) {
    super('SaleOrder', localDb, centralApi);
  }

  async shouldSync(localEntity: any, centralEntity: any): Promise<boolean> {
    // Always sync orders - they are critical business data
    return true;
  }

  async mergeChanges(localData: any, centralData: any): Promise<any> {
    // For orders, terminal usually wins as it's the source of truth
    return localData;
  }

  getSyncPriority(entity: any): number {
    // Orders are highest priority
    return entity.status === 'COMPLETED' ? 10 : 8;
  }
}

