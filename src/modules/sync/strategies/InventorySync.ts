import { EntitySyncStrategy } from './EntitySyncStrategy.js';

export class InventorySyncStrategy extends EntitySyncStrategy {
  constructor(localDb: any, centralApi: any) {
    super('InventoryItem', localDb, centralApi);
  }

  async shouldSync(localEntity: any, centralEntity: any): Promise<boolean> {
    // Always sync inventory - critical for preventing overselling
    return true;
  }

  async mergeChanges(localData: any, centralData: any): Promise<any> {
    // For inventory, central usually wins to prevent overselling
    // But preserve local adjustments that haven't been synced
    return {
      ...centralData,
      quantityOnHand: centralData.quantityOnHand,
      quantityReserved: centralData.quantityReserved,
      quantityAvailable: centralData.quantityAvailable,
      // Preserve local pending adjustments
      pendingSync: localData.pendingSync
    };
  }

  getSyncPriority(entity: any): number {
    // Inventory is critical priority
    return 9;
  }
}

