export interface PushResponse {
  results: ChangeResult[];
}

export interface ChangeResult {
  entityType: string;
  entityId: string;
  success: boolean;
  error: string | null;
  conflict: boolean;
  centralData?: any;
  newSyncVersion?: number;
}

export class CentralSyncService {
  constructor(private centralDb: any) {}

  async processPush(terminalId: string, changes: any[]): Promise<PushResponse> {
    const response: PushResponse = {
      results: []
    };

    for (const change of changes) {
      try {
        const result = await this.processSingleChange(terminalId, change);
        response.results.push(result);
      } catch (error: any) {
        response.results.push({
          entityType: change.entityType,
          entityId: change.entityId,
          success: false,
          error: error.message,
          conflict: false
        });
      }
    }

    return response;
  }

  private async processSingleChange(terminalId: string, change: any): Promise<ChangeResult> {
    const { entityType, entityId, operation, data, syncVersion } = change;

    // Check for conflicts
    const existing = await this.centralDb[entityType].findUnique({
      where: { id: entityId }
    });

    if (existing && existing.syncVersion > syncVersion) {
      return {
        entityType,
        entityId,
        success: false,
        error: 'Version conflict',
        conflict: true,
        centralData: existing
      };
    }

    // Process operation
    switch (operation) {
      case 'CREATE':
        await this.centralDb[entityType].create({
          data: {
            ...data,
            sourceTerminalId: terminalId,
            syncVersion: 1,
            lastSyncedAt: new Date()
          }
        });
        break;

      case 'UPDATE':
        await this.centralDb[entityType].update({
          where: { id: entityId },
          data: {
            ...data,
            lastSyncedAt: new Date(),
            syncVersion: { increment: 1 }
          }
        });
        break;

      case 'DELETE':
        await this.centralDb[entityType].update({
          where: { id: entityId },
          data: {
            isActive: false,
            deletedAt: new Date(),
            lastSyncedAt: new Date()
          }
        });
        break;
    }

    return {
      entityType,
      entityId,
      success: true,
      error: null,
      conflict: false,
      newSyncVersion: (existing?.syncVersion || 0) + 1
    };
  }

  async getChangesSince(terminalId: string, entityType: string, since: Date): Promise<any[]> {
    // Get terminal's branch/location to scope data
    const terminal = await this.centralDb.terminal.findUnique({
      where: { id: terminalId },
      include: { branch: true, location: true }
    });

    if (!terminal) {
      throw new Error('Terminal not found');
    }

    // Build query based on entity type and terminal scope
    const query = this.buildScopeQuery(entityType, terminal, since);
    
    return await this.centralDb[entityType].findMany(query);
  }

  private buildScopeQuery(entityType: string, terminal: any, since: Date): any {
    // Build base where clause based on entity type capabilities
    const whereClause: any = {};
    const orderBy: any = {};

    // Add lastSyncedAt filter only if entity type supports it
    const entitiesWithLastSyncedAt = ['Product', 'Customer', 'InventoryItem', 'SaleOrder', 'Category', 'Brand'];
    if (entitiesWithLastSyncedAt.includes(entityType)) {
      whereClause.lastSyncedAt = { gt: since };
      orderBy.lastSyncedAt = 'asc';
    } else {
      // For entities without lastSyncedAt, use updatedAt or createdAt
      whereClause.updatedAt = { gt: since };
      orderBy.updatedAt = 'asc';
    }

    // Add isActive filter only if entity type supports it
    const entitiesWithIsActive = ['Product', 'Customer', 'Category', 'Brand', 'TaxCategory'];
    if (entitiesWithIsActive.includes(entityType)) {
      whereClause.isActive = true;
    }

    // Add scoping based on entity type and terminal permissions
    switch (entityType) {
      case 'Product':
      case 'Category':
      case 'Brand':
        return {
          where: {
            ...whereClause,
            storeId: terminal.storeId
          },
          orderBy
        };

      case 'TaxCategory':
        return {
          where: {
            ...whereClause,
            storeId: terminal.storeId
          },
          orderBy
        };

      case 'InventoryItem':
        return {
          where: {
            ...whereClause,
            location: { branchId: terminal.branchId }
          },
          orderBy
        };

      case 'SaleOrder':
        return {
          where: {
            ...whereClause,
            OR: [
              { terminalId: terminal.id },
              { location: { branchId: terminal.branchId } }
            ]
          },
          orderBy
        };

      case 'Customer':
        return {
          where: {
            ...whereClause,
            storeId: terminal.storeId
          },
          orderBy
        };

      default:
        return {
          where: whereClause,
          orderBy
        };
    }
  }

  async resolveConflict(conflictId: string, resolvedData: any, resolution: string): Promise<void> {
    // Update conflict record in central database
    await this.centralDb.syncConflict.update({
      where: { id: conflictId },
      data: {
        resolvedData,
        resolution: resolution as any,
        resolvedAt: new Date()
      }
    });
  }

  async updateTerminalStatus(terminalId: string, status: string): Promise<void> {
    await this.centralDb.terminal.update({
      where: { id: terminalId },
      data: {
        status: status as any,
        lastHeartbeat: new Date()
      }
    });
  }

  /**
   * Trigger full sync for a terminal (both push and pull)
   * This prepares the server to handle sync requests from the terminal
   */
  async triggerFullSync(terminalId: string): Promise<any> {
    const entityTypes = ['Product', 'Customer', 'InventoryItem', 'SaleOrder', 'Category', 'Brand', 'TaxCategory'];
    const pullResults: any[] = [];
    
    // Prepare pull data for all entity types (get all changes since beginning)
    for (const entityType of entityTypes) {
      try {
        const changes = await this.getChangesSince(terminalId, entityType, new Date(0));
        pullResults.push({
          entityType,
          count: changes.length,
          success: true,
          data: changes
        });
      } catch (error: any) {
        pullResults.push({
          entityType,
          count: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Update terminal status to SYNCING
    await this.updateTerminalStatus(terminalId, 'SYNCING');

    return {
      terminalId,
      pull: {
        results: pullResults,
        totalEntities: pullResults.reduce((sum, r) => sum + r.count, 0)
      },
      message: 'Full sync triggered. Terminal should now push changes and pull updates.'
    };
  }

  /**
   * Get all active terminals that need sync
   */
  async getActiveTerminals(): Promise<any[]> {
    // Get all terminals that are active (activated by admin)
    // Status can be ONLINE, OFFLINE, or even INACTIVE (just activated but not yet connected)
    return await this.centralDb.terminal.findMany({
      where: {
        isActive: true
        // Removed status filter to include all active terminals regardless of current connection status
        // This allows terminals that are activated but not yet connected to receive sync triggers
      },
      select: {
        id: true,
        terminalCode: true,
        terminalName: true,
        status: true,
        isActive: true
      }
    });
  }

  /**
   * Get sync status with counts for pending, failed, and synced tables
   */
  async getSyncStatus(terminalId?: string): Promise<any> {
    const entityTypes = ['Product', 'Customer', 'InventoryItem', 'SaleOrder', 'Category', 'Brand', 'TaxCategory'];
    const statusByTable: any = {};

    // Initialize status for each entity type
    for (const entityType of entityTypes) {
      statusByTable[entityType] = {
        pending: 0,
        failed: 0,
        synced: 0,
        conflicts: 0
      };
    }

    // Get pending changes from TerminalSyncState
    const syncStateWhere: any = {};
    if (terminalId) {
      syncStateWhere.terminalId = terminalId;
    }

    const syncStates = await this.centralDb.terminalSyncState.findMany({
      where: syncStateWhere,
      select: {
        terminalId: true,
        pendingChanges: true
      }
    });

    // Aggregate pending changes (distributed across entity types)
    const totalPending = syncStates.reduce((sum: number, state: any) => sum + state.pendingChanges, 0);
    const pendingPerTable = Math.floor(totalPending / entityTypes.length);
    const remainder = totalPending % entityTypes.length;
    
    entityTypes.forEach((entityType, index) => {
      statusByTable[entityType].pending = pendingPerTable + (index < remainder ? 1 : 0);
    });

    // Get failed syncs from SyncLog
    const failedLogsWhere: any = {
      success: false,
      completedAt: { not: null }
    };
    if (terminalId) {
      failedLogsWhere.terminalId = terminalId;
    }

    const failedLogs = await this.centralDb.syncLog.findMany({
      where: failedLogsWhere,
      select: {
        entitiesProcessed: true
      }
    });

    // Distribute failed counts (we don't have entity type in SyncLog, so distribute evenly)
    const totalFailed = failedLogs.reduce((sum: number, log: any) => sum + log.entitiesProcessed, 0);
    const failedPerTable = Math.floor(totalFailed / entityTypes.length);
    const failedRemainder = totalFailed % entityTypes.length;
    
    entityTypes.forEach((entityType, index) => {
      statusByTable[entityType].failed = failedPerTable + (index < failedRemainder ? 1 : 0);
    });

    // Get successful syncs from SyncLog
    const successLogsWhere: any = {
      success: true,
      completedAt: { not: null }
    };
    if (terminalId) {
      successLogsWhere.terminalId = terminalId;
    }

    const successLogs = await this.centralDb.syncLog.findMany({
      where: successLogsWhere,
      select: {
        entitiesProcessed: true,
        entitiesCreated: true,
        entitiesUpdated: true
      }
    });

    // Aggregate successful syncs
    const totalSynced = successLogs.reduce((sum: number, log: any) => 
      sum + (log.entitiesCreated || 0) + (log.entitiesUpdated || 0), 0
    );
    const syncedPerTable = Math.floor(totalSynced / entityTypes.length);
    const syncedRemainder = totalSynced % entityTypes.length;
    
    entityTypes.forEach((entityType, index) => {
      statusByTable[entityType].synced = syncedPerTable + (index < syncedRemainder ? 1 : 0);
    });

    // Get pending conflicts
    const conflictsWhere: any = {
      resolution: 'PENDING'
    };
    if (terminalId) {
      conflictsWhere.terminalId = terminalId;
    }

    const conflicts = await this.centralDb.syncConflict.groupBy({
      by: ['entityType'],
      where: conflictsWhere,
      _count: {
        id: true
      }
    });

    // Add conflict counts by entity type
    conflicts.forEach((conflict: any) => {
      if (statusByTable[conflict.entityType]) {
        statusByTable[conflict.entityType].conflicts = conflict._count.id;
      }
    });

    // Calculate totals
    const totals = {
      pending: Object.values(statusByTable).reduce((sum: number, table: any) => sum + table.pending, 0),
      failed: Object.values(statusByTable).reduce((sum: number, table: any) => sum + table.failed, 0),
      synced: Object.values(statusByTable).reduce((sum: number, table: any) => sum + table.synced, 0),
      conflicts: Object.values(statusByTable).reduce((sum: number, table: any) => sum + table.conflicts, 0)
    };

    return {
      terminalId: terminalId || 'all',
      tables: statusByTable,
      totals,
      summary: {
        totalTables: entityTypes.length,
        tablesWithPending: Object.values(statusByTable).filter((table: any) => table.pending > 0).length,
        tablesWithFailed: Object.values(statusByTable).filter((table: any) => table.failed > 0).length,
        tablesWithSynced: Object.values(statusByTable).filter((table: any) => table.synced > 0).length,
        tablesWithConflicts: Object.values(statusByTable).filter((table: any) => table.conflicts > 0).length
      }
    };
  }
}

