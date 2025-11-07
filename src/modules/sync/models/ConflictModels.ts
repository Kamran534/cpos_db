export type ConflictType = 'CONCURRENT_UPDATE' | 'DELETED_UPDATE' | 'DUPLICATE_CREATE' | 'VERSION_MISMATCH';
export type ConflictResolution = 'PENDING' | 'TERMINAL_WINS' | 'CENTRAL_WINS' | 'MANUAL_MERGE' | 'DISCARD';

export interface ConflictRecord {
  id: string;
  terminalId: string;
  entityType: string;
  entityId: string;
  conflictType: ConflictType;
  detectedAt: Date;
  terminalData: any;
  centralData: any;
  resolvedData?: any;
  resolution: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNote?: string;
}

export interface ResolutionResult {
  success: boolean;
  resolution: ConflictResolution;
}

export interface ConflictResolutionStrategy {
  resolve(conflict: ConflictRecord): Promise<{ resolvedData: any; resolution: ConflictResolution }>;
}

