import { PushService } from './PushService.js';
import { PullService } from './PullService.js';
import { ConflictResolver } from './ConflictResolver.js';
import { SyncLogger } from '../utils/SyncLogger.js';
import type { SyncConfig, SyncResult } from '../models/SyncTypes.js';

export class SyncService {
  private pushService: PushService;
  private pullService: PullService;
  private conflictResolver: ConflictResolver;
  private logger: SyncLogger;
  private isSyncing = false;
  private syncIntervalId?: NodeJS.Timeout;

  constructor(
    private localDb: any,
    private centralApi: any,
    private config: SyncConfig
  ) {
    this.pushService = new PushService(localDb, centralApi, config);
    this.pullService = new PullService(localDb, centralApi, config);
    this.conflictResolver = new ConflictResolver(localDb, centralApi);
    this.logger = new SyncLogger();
  }

  async initialize(terminalId: string): Promise<void> {
    this.logger.info(`Initializing sync service for terminal: ${terminalId}`);
    
    // Create initial sync state
    await this.localDb.operationMode.upsert({
      where: { terminalId },
      update: {},
      create: {
        terminalId,
        currentMode: 'ONLINE',
        centralBaseURL: this.centralApi.baseURL,
        syncEndpoint: '/api/sync'
      }
    });

    // Start periodic sync
    this.startPeriodicSync();
  }

  async performFullSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.info('Starting full sync...');

      // Step 1: Resolve pending conflicts
      await this.resolvePendingConflicts();

      // Step 2: Push local changes to central
      const pushResult = await this.pushService.pushAllChanges();

      // Step 3: Pull central changes to local
      const pullResult = await this.pullService.pullAllChanges();

      // Step 4: Update sync metadata
      await this.updateSyncMetadata();

      const duration = Date.now() - startTime;
      
      this.logger.info(`Full sync completed in ${duration}ms`, {
        pushed: pushResult.successCount,
        pulled: pullResult.successCount,
        conflicts: pushResult.conflictCount + pullResult.conflictCount
      });

      return {
        success: true,
        pushed: pushResult.successCount,
        pulled: pullResult.successCount,
        conflicts: pushResult.conflictCount + pullResult.conflictCount,
        duration
      };

    } catch (error: any) {
      this.logger.error('Full sync failed', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async performIncrementalSync(): Promise<SyncResult> {
    this.isSyncing = true;

    try {
      // Push high priority changes first
      await this.pushService.pushChangesByPriority(['CRITICAL', 'HIGH']);

      // Pull critical updates
      await this.pullService.pullChangesByPriority(['CRITICAL', 'HIGH']);

      return { success: true, pushed: 0, pulled: 0, conflicts: 0, duration: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  private async resolvePendingConflicts(): Promise<void> {
    const conflicts = await this.localDb.syncConflict.findMany({
      where: { resolution: 'PENDING' }
    });

    for (const conflict of conflicts) {
      await this.conflictResolver.resolve(conflict);
    }
  }

  private async updateSyncMetadata(): Promise<void> {
    const now = new Date();
    
    // Update all synced entities
    const entities = ['Product', 'Customer', 'SaleOrder', 'InventoryItem'];
    
    for (const entity of entities) {
      await this.localDb[entity].updateMany({
        where: { isDirty: true, lastSyncedAt: { lt: now } },
        data: { 
          isDirty: false,
          lastSyncedAt: now 
        }
      });
    }
  }

  private startPeriodicSync(): void {
    this.syncIntervalId = setInterval(async () => {
      if (!this.isSyncing) {
        try {
          await this.performIncrementalSync();
        } catch (error) {
          this.logger.error('Periodic sync failed', error);
        }
      }
    }, this.config.syncInterval * 1000);
  }

  stop(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
  }
}

