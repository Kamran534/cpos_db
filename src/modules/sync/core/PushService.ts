import { BatchProcessor } from '../utils/BatchProcessor.js';
import { RetryManager } from '../utils/RetryManager.js';
import { SyncPriority } from './SyncPriority.js';

export interface PushResult {
  successCount: number;
  failureCount: number;
  conflictCount: number;
}

export class PushService {
  private batchProcessor: BatchProcessor;
  private retryManager: RetryManager;

  constructor(
    private localDb: any,
    private centralApi: any,
    private config: any
  ) {
    this.batchProcessor = new BatchProcessor(config.batchSize);
    this.retryManager = new RetryManager(config.maxRetries, config.retryDelay);
  }

  async pushAllChanges(): Promise<PushResult> {
    const result: PushResult = {
      successCount: 0,
      failureCount: 0,
      conflictCount: 0
    };

    // Process by priority
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    for (const priority of priorities) {
      const priorityResult = await this.pushChangesByPriority([priority]);
      result.successCount += priorityResult.successCount;
      result.failureCount += priorityResult.failureCount;
      result.conflictCount += priorityResult.conflictCount;
    }

    return result;
  }

  async pushChangesByPriority(priorities: string[]): Promise<PushResult> {
    const result: PushResult = {
      successCount: 0,
      failureCount: 0,
      conflictCount: 0
    };

    // Get outbox items by priority
    const priorityValues = priorities.map(p => SyncPriority.getPriorityValue(p));
    const outboxItems = await this.localDb.outbox.findMany({
      where: {
        syncPriority: { in: priorityValues },
        attemptCount: { lt: this.config.maxRetries }
      },
      orderBy: [
        { syncPriority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    // Process in batches
    const batches = this.batchProcessor.createBatches(outboxItems);
    
    for (const batch of batches) {
      const batchResult = await this.processPushBatch(batch);
      result.successCount += batchResult.successCount;
      result.failureCount += batchResult.failureCount;
      result.conflictCount += batchResult.conflictCount;
    }

    return result;
  }

  private async processPushBatch(batch: any[]): Promise<PushResult> {
    const result: PushResult = {
      successCount: 0,
      failureCount: 0,
      conflictCount: 0
    };

    const promises = batch.map(item => this.processPushItem(item));
    const results = await Promise.allSettled(promises);

    for (const itemResult of results) {
      if (itemResult.status === 'fulfilled') {
        const { success, isConflict } = itemResult.value;
        
        if (success) {
          result.successCount++;
        } else if (isConflict) {
          result.conflictCount++;
        } else {
          result.failureCount++;
        }
      } else {
        result.failureCount++;
      }
    }

    return result;
  }

  private async processPushItem(outboxItem: any): Promise<{ success: boolean; isConflict: boolean }> {
    return this.retryManager.execute(async () => {
      try {
        // Convert operation to central API call
        const response = await this.sendToCentral(outboxItem);

        if (response.success) {
          // Mark as completed
          await this.localDb.outbox.update({
            where: { id: outboxItem.id },
            data: {
              attemptCount: { increment: 1 },
              lastAttemptAt: new Date()
            }
          });

          // Update main entity
          await this.markEntityAsSynced(outboxItem.entityType, outboxItem.entityId);

          return { success: true, isConflict: false };
        } else if (response.conflict) {
          // Create conflict record
          await this.createConflictRecord(outboxItem, response.centralData);
          return { success: false, isConflict: true };
        } else {
          // Update attempt count
          await this.localDb.outbox.update({
            where: { id: outboxItem.id },
            data: {
              attemptCount: { increment: 1 },
              lastAttemptAt: new Date(),
              errorMessage: response.error
            }
          });
          return { success: false, isConflict: false };
        }
      } catch (error: any) {
        // Update attempt count on error
        await this.localDb.outbox.update({
          where: { id: outboxItem.id },
          data: {
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            errorMessage: error.message
          }
        });
        throw error;
      }
    });
  }

  private async sendToCentral(outboxItem: any): Promise<any> {
    const payload = {
      terminalId: outboxItem.terminalId,
      entityType: outboxItem.entityType,
      entityId: outboxItem.entityId,
      operation: outboxItem.operation,
      data: outboxItem.data,
      syncVersion: outboxItem.syncVersion,
      localTimestamp: outboxItem.localTimestamp
    };

    return await this.centralApi.post('/sync/push', payload);
  }

  private async markEntityAsSynced(entityType: string, entityId: string): Promise<void> {
    await this.localDb[entityType].update({
      where: { id: entityId },
      data: {
        isDirty: false,
        lastSyncedAt: new Date()
      }
    });
  }

  private async createConflictRecord(outboxItem: any, centralData: any): Promise<void> {
    await this.localDb.syncConflict.create({
      data: {
        terminalId: outboxItem.terminalId,
        entityType: outboxItem.entityType,
        entityId: outboxItem.entityId,
        conflictType: 'CONCURRENT_UPDATE',
        terminalData: outboxItem.data,
        centralData: centralData,
        resolution: 'PENDING',
        detectedAt: new Date()
      }
    });
  }
}

