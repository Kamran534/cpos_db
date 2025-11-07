import { EntitySyncStrategy } from './EntitySyncStrategy.js';

export class ProductSyncStrategy extends EntitySyncStrategy {
  constructor(localDb: any, centralApi: any) {
    super('Product', localDb, centralApi);
  }

  async shouldSync(localEntity: any, centralEntity: any): Promise<boolean> {
    // Always sync product changes - they affect pricing and availability
    return true;
  }

  async mergeChanges(localData: any, centralData: any): Promise<any> {
    // Prefer central data for critical fields, but preserve local modifications
    return {
      ...localData,
      name: centralData.name || localData.name,
      price: centralData.price, // Always use central pricing
      cost: centralData.cost,
      isActive: centralData.isActive,
      // Preserve local inventory adjustments
      inventoryItems: localData.inventoryItems
    };
  }

  getSyncPriority(entity: any): number {
    // Products are high priority - they affect sales
    return 7;
  }
}

