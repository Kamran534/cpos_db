import type { ResolutionResult, ConflictRecord } from '../models/ConflictModels.js';

export class ConflictResolver {
  constructor(
    private localDb: any,
    private centralApi: any
  ) {}

  async resolve(conflict: ConflictRecord): Promise<ResolutionResult> {
    try {
      let resolvedData: any;
      let resolution: string;

      switch (conflict.conflictType) {
        case 'CONCURRENT_UPDATE':
          ({ resolvedData, resolution } = await this.resolveConcurrentUpdate(conflict));
          break;
        
        case 'DELETED_UPDATE':
          ({ resolvedData, resolution } = await this.resolveDeletedUpdate(conflict));
          break;
        
        case 'DUPLICATE_CREATE':
          ({ resolvedData, resolution } = await this.resolveDuplicateCreate(conflict));
          break;
        
        default:
          throw new Error(`Unknown conflict type: ${conflict.conflictType}`);
      }

      // Apply resolution
      await this.applyResolution(conflict, resolvedData, resolution);

      return { success: true, resolution: resolution as any };

    } catch (error: any) {
      console.error('Conflict resolution failed:', error);
      return { success: false, resolution: 'PENDING' };
    }
  }

  private async resolveConcurrentUpdate(conflict: ConflictRecord): Promise<{ resolvedData: any; resolution: string }> {
    const terminalData = conflict.terminalData;
    const centralData = conflict.centralData;

    // Strategy: Last write wins based on timestamp
    const terminalTime = new Date(terminalData.updatedAt || terminalData.createdAt);
    const centralTime = new Date(centralData.updatedAt || centralData.createdAt);

    if (terminalTime > centralTime) {
      return { resolvedData: terminalData, resolution: 'TERMINAL_WINS' };
    } else {
      return { resolvedData: centralData, resolution: 'CENTRAL_WINS' };
    }
  }

  private async resolveDeletedUpdate(conflict: ConflictRecord): Promise<{ resolvedData: any; resolution: string }> {
    // If central says deleted, usually central wins
    if (conflict.centralData.isDeleted) {
      return { resolvedData: null, resolution: 'CENTRAL_WINS' };
    } else {
      // Keep terminal data but mark appropriately
      return { resolvedData: conflict.terminalData, resolution: 'TERMINAL_WINS' };
    }
  }

  private async resolveDuplicateCreate(conflict: ConflictRecord): Promise<{ resolvedData: any; resolution: string }> {
    // Merge data where possible, otherwise use central
    const mergedData = { ...conflict.centralData, ...conflict.terminalData };
    return { resolvedData: mergedData, resolution: 'MANUAL_MERGE' };
  }

  private async applyResolution(conflict: ConflictRecord, resolvedData: any, resolution: string): Promise<void> {
    // Update local database
    if (resolution === 'CENTRAL_WINS' || resolution === 'MANUAL_MERGE') {
      await this.localDb[conflict.entityType].upsert({
        where: { id: conflict.entityId },
        update: {
          ...resolvedData,
          isDirty: false,
          lastSyncedAt: new Date()
        },
        create: {
          id: conflict.entityId,
          ...resolvedData,
          isDirty: false,
          lastSyncedAt: new Date()
        }
      });
    }

    // Update conflict record
    await this.localDb.syncConflict.update({
      where: { id: conflict.id },
      data: {
        resolution: resolution as any,
        resolvedData,
        resolvedAt: new Date(),
        resolvedBy: 'SYSTEM'
      }
    });

    // If terminal wins, push the resolved data to central
    if (resolution === 'TERMINAL_WINS') {
      await this.pushResolvedData(conflict, resolvedData);
    }
  }

  private async pushResolvedData(conflict: ConflictRecord, resolvedData: any): Promise<void> {
    await this.centralApi.post('/sync/resolve', {
      conflictId: conflict.id,
      resolvedData,
      resolution: 'TERMINAL_WINS'
    });
  }
}

