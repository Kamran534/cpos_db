export interface SyncConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  syncInterval: number;
  conflictStrategy: 'TERMINAL_WINS' | 'CENTRAL_WINS' | 'MANUAL';
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  duration: number;
}

export interface PushResult {
  successCount: number;
  failureCount: number;
  conflictCount: number;
}

export interface PullResult {
  successCount: number;
  failureCount: number;
  conflictCount: number;
}

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncDirection = 'UPLOAD' | 'DOWNLOAD' | 'BIDIRECTIONAL';
export type SyncType = 'FULL' | 'INCREMENTAL' | 'PUSH_ONLY' | 'PULL_ONLY';

export interface OutboxItem {
  id: string;
  terminalId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: any;
  createdInMode: string;
  syncPriority: number;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  localTimestamp: Date;
  syncVersion: number;
}

export interface SyncChange {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: any;
  syncVersion: number;
  timestamp: Date;
}

