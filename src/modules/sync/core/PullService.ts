import type { PullResult } from '../models/SyncTypes.js';

export class PullService {
  constructor(
    private localDb: any,
    private centralApi: any,
    private config: any
  ) {}

  async pullAllChanges(): Promise<PullResult> {
    const result: PullResult = {
      successCount: 0,
      failureCount: 0,
      conflictCount: 0
    };

    // Define entities to sync with their strategies
    const syncEntities = [
      { entity: 'Product', strategy: 'product' },
      { entity: 'Customer', strategy: 'customer' },
      { entity: 'InventoryItem', strategy: 'inventory' },
      { entity: 'SaleOrder', strategy: 'order' },
      { entity: 'Category', strategy: 'reference' },
      { entity: 'Brand', strategy: 'reference' },
      { entity: 'TaxCategory', strategy: 'reference' }
    ];

    for (const { entity, strategy } of syncEntities) {
      const entityResult = await this.pullEntityChanges(entity, strategy);
      result.successCount += entityResult.successCount;
      result.failureCount += entityResult.failureCount;
      result.conflictCount += entityResult.conflictCount;
    }

    return result;
  }

  async pullChangesByPriority(priorities: string[]): Promise<PullResult> {
    const result: PullResult = {
      successCount: 0,
      failureCount: 0,
      conflictCount: 0
    };

    // For now, pull all changes - priority filtering can be added
    const pullResult = await this.pullAllChanges();
    return pullResult;
  }

  async pullEntityChanges(entityType: string, strategy: string): Promise<PullResult> {
    const result: PullResult = {
      successCount: 0,
      failureCount: 0,
      conflictCount: 0
    };

    try {
      // Get last sync timestamp for this entity
      const lastSync = await this.getLastSyncTime(entityType);
      
      // Fetch changes from central
      const changes = await this.centralApi.get('/sync/pull', {
        params: { entityType, lastSync }
      });

      // Process each change
      for (const change of changes) {
        const changeResult = await this.processPullChange(entityType, change, strategy);
        
        if (changeResult.success) {
          result.successCount++;
        } else if (changeResult.conflict) {
          result.conflictCount++;
        } else {
          result.failureCount++;
        }
      }

      // Update last sync time
      await this.updateLastSyncTime(entityType);

    } catch (error: any) {
      console.error(`Failed to pull ${entityType} changes:`, error);
      result.failureCount++;
    }

    return result;
  }

  private async processPullChange(entityType: string, change: any, strategy: string): Promise<{ success: boolean; conflict: boolean }> {
    try {
      const localEntity = await this.localDb[entityType].findUnique({
        where: { id: change.id }
      });

      if (!localEntity) {
        // Create new entity
        await this.localDb[entityType].create({
          data: {
            ...change.data,
            isDirty: false,
            lastSyncedAt: new Date()
          }
        });
        return { success: true, conflict: false };
      }

      // Check for conflicts
      if (this.hasConflict(localEntity, change, strategy)) {
        await this.handlePullConflict(entityType, localEntity, change);
        return { success: false, conflict: true };
      }

      // Update existing entity
      await this.localDb[entityType].update({
        where: { id: change.id },
        data: {
          ...change.data,
          isDirty: false,
          lastSyncedAt: new Date(),
          syncVersion: change.syncVersion
        }
      });

      return { success: true, conflict: false };

    } catch (error: any) {
      console.error(`Failed to process ${entityType} change:`, error);
      return { success: false, conflict: false };
    }
  }

  private hasConflict(localEntity: any, centralChange: any, strategy: string): boolean {
    // Different conflict detection per strategy
    switch (strategy) {
      case 'product':
      case 'customer':
        return localEntity.syncVersion > centralChange.syncVersion && localEntity.isDirty;
      
      case 'inventory':
        // For inventory, always accept central changes to prevent overselling
        return false;
      
      case 'order':
        // For orders, terminal usually wins
        return localEntity.syncVersion >= centralChange.syncVersion;
      
      default:
        return localEntity.syncVersion > centralChange.syncVersion;
    }
  }

  private async handlePullConflict(entityType: string, localEntity: any, centralChange: any): Promise<void> {
    await this.localDb.syncConflict.create({
      data: {
        terminalId: localEntity.terminalId || 'unknown',
        entityType,
        entityId: localEntity.id,
        conflictType: 'CONCURRENT_UPDATE',
        terminalData: localEntity,
        centralData: centralChange.data,
        resolution: 'PENDING',
        detectedAt: new Date()
      }
    });
  }

  private async getLastSyncTime(entityType: string): Promise<Date> {
    const syncState = await this.localDb.syncHistory.findFirst({
      where: { syncType: 'PULL_ONLY' },
      orderBy: { startedAt: 'desc' }
    });
    
    return syncState?.startedAt || new Date(0);
  }

  private async updateLastSyncTime(entityType: string): Promise<void> {
    // Update sync history
    await this.localDb.syncHistory.create({
      data: {
        terminalId: 'current-terminal',
        syncType: 'PULL_ONLY',
        direction: 'DOWNLOAD',
        startedAt: new Date(),
        completedAt: new Date(),
        success: true
      }
    });
  }
}

