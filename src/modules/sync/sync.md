# Sync Module - Checklist & Notes

## Checklist (Done)
- Bidirectional sync between PostgreSQL (remote) and SQLite (local)
- Sync queue management using `SyncQueue` table
- Controllers and routes
  - POST `/api/sync/push` - Push local changes to remote
  - POST `/api/sync/pull` - Pull remote changes to local
  - POST `/api/sync/run` - Run bidirectional sync
  - GET `/api/sync/status` - Get sync status and statistics
  - GET `/api/sync/pending` - Get pending queue items
  - POST `/api/sync/retry` - Retry failed sync items
- Automatic hourly sync via cron job
- Manual sync trigger on login
- Field mapping between schemas (toRemote/toLocal)
- Enum mapping (SyncStatus, SyncDirection, etc.)
- Image array/string conversion (String[] <-> String?)
- Error handling and retry mechanism
- Comprehensive Swagger documentation
- Environment variable configuration
- Sync statistics and logging

## Database Schema
- Uses `SyncQueue` model from `prisma/schema.payflow.prisma`
- Uses `LocalSettings` model for sync timestamp storage
- Remote database: PostgreSQL (`prisma/schema.prisma`)
- Local database: SQLite (`prisma/schema.payflow.prisma`)

## Configuration (.env)
```env
# Database URLs
POSTGRES_URL_REMOTE=postgresql://user:password@host:5432/database
SQLITE_PATH_LOCAL=file:./prisma/payflow.db

# Sync Batch Sizes
SYNC_PULL_BATCH_SIZE=500
SYNC_PUSH_BATCH_SIZE=100

# Retry Configuration
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY_MS=5000

# Timeout Configuration
SYNC_TIMEOUT_MS=30000

# Queue Configuration
SYNC_QUEUE_LIMIT=100
SYNC_QUEUE_PRIORITY_DEFAULT=5

# Sync Control
SYNC_ENABLED=true

# Sync Schedule
SYNC_INTERVAL=0 * * * *
SYNC_TIMEZONE=UTC

# Logging
SYNC_LOG_ENABLED=true

# Models to Sync (optional - comma-separated)
# SYNC_MODELS=Customer,Product,SaleOrder
```

## Testing Checklist
- Push local changes → Verify in remote database
- Pull remote changes → Verify in local database
- Bidirectional sync (push + pull)
- Check sync status endpoint
- Get pending queue items with filters
- Retry failed sync items
- Automatic hourly sync via cron
- Manual sync trigger on login
- Sync with different batch sizes
- Sync timeout handling
- Retry mechanism for failed items
- Sync statistics and logging

## Known Issues / TODOs
- Add conflict resolution strategy (terminal-wins, csu-wins, merge)
- Add sync history logging to `SyncHistory` table
- Add sync conflict detection and resolution
- Add per-model sync filters (e.g., only sync active records)
- Add sync progress tracking for large batches
- Add sync webhook notifications
- Add sync performance metrics
- Optional: Add sync encryption for sensitive data
- Optional: Add sync compression for large payloads
- Optional: Add sync versioning for schema changes
- Optional: Add sync rollback mechanism

## Notes
- Sync uses `updatedAt` timestamp for incremental pull sync.
- Sync queue items are processed in priority order (higher priority first).
- Failed items are retried up to `SYNC_MAX_RETRIES` times.
- Sync is disabled if `SYNC_ENABLED=false` in environment.
- Sync interval uses standard cron syntax (default: hourly at minute 0).
- Sync logs are controlled by `SYNC_LOG_ENABLED` environment variable.
- Models to sync can be configured via `SYNC_MODELS` environment variable.
- Image arrays are converted to single strings for SQLite compatibility.

