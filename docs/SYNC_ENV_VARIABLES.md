# Sync Module Environment Variables

This document lists all environment variables used in the sync module.

## Database Configuration

### SQLite (Local Database)
- `SQLITE_PATH_LOCAL` - Path to SQLite database file
  - Default: `file:./prisma/payflow.db`
  - Example: `file:./data/payflow.db` or `C:/path/to/payflow.db`

### PostgreSQL (Remote Database)
- `POSTGRES_URL_REMOTE` - PostgreSQL connection string
  - Example: `postgresql://user:password@host:5432/database`
- `POSTGRES_URL` - Alternative PostgreSQL connection string (fallback)

## Sync Configuration

### Batch Sizes
- `SYNC_PULL_BATCH_SIZE` - Number of records to pull per model in one sync cycle
  - Default: `500`
  - Type: Number
  - Example: `1000`

- `SYNC_PUSH_BATCH_SIZE` - Number of queue items to process per sync cycle
  - Default: `100`
  - Type: Number
  - Example: `200`

### Retry Configuration
- `SYNC_MAX_RETRIES` - Maximum number of retry attempts for failed sync operations
  - Default: `3`
  - Type: Number
  - Example: `5`

- `SYNC_RETRY_DELAY_MS` - Delay between retry attempts (milliseconds)
  - Default: `5000` (5 seconds)
  - Type: Number
  - Example: `10000` (10 seconds)

### Timeout Configuration
- `SYNC_TIMEOUT_MS` - Timeout for sync operations (milliseconds)
  - Default: `30000` (30 seconds)
  - Type: Number
  - Set to `0` to disable timeout
  - Example: `60000` (60 seconds)

### Queue Configuration
- `SYNC_QUEUE_LIMIT` - Default limit for queue queries
  - Default: `100`
  - Type: Number
  - Example: `250`

- `SYNC_QUEUE_PRIORITY_DEFAULT` - Default priority for sync queue items
  - Default: `5`
  - Type: Number
  - Range: 1-10 (higher = more priority)
  - Example: `7`

### Sync Control
- `SYNC_ENABLED` - Enable or disable sync functionality
  - Default: `true`
  - Type: Boolean
  - Set to `false` to disable sync
  - Example: `true` or `false`

### Sync Schedule
- `SYNC_INTERVAL` - Cron schedule for automatic sync
  - Default: `0 * * * *` (hourly at minute 0)
  - Type: String (cron expression)
  - Examples:
    - `0 * * * *` - Every hour
    - `*/15 * * * *` - Every 15 minutes
    - `0 */2 * * *` - Every 2 hours
    - `0 0 * * *` - Daily at midnight
    - `0 9 * * 1-5` - Weekdays at 9 AM

- `SYNC_TIMEZONE` - Timezone for cron schedule
  - Default: `UTC`
  - Type: String
  - Example: `America/New_York`, `Europe/London`, `Asia/Kolkata`

### Logging
- `SYNC_LOG_ENABLED` - Enable or disable sync logging
  - Default: `true`
  - Type: Boolean
  - Set to `false` to disable sync logs
  - Example: `true` or `false`

### Models to Sync
- `SYNC_MODELS` - Comma-separated list of models to sync
  - Default: All models (Customer, Product, ProductVariant, SaleOrder, etc.)
  - Type: String (comma-separated)
  - Example: `Customer,Product,SaleOrder`
  - If not set, syncs all configured models

## Example .env Configuration

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

# Models to Sync (optional - uses default if not set)
# SYNC_MODELS=Customer,Product,SaleOrder
```

## Notes

- All sync-related environment variables are optional and have sensible defaults
- The sync module will work without any environment variables configured
- To disable sync completely, set `SYNC_ENABLED=false`
- To disable logging, set `SYNC_LOG_ENABLED=false`
- To disable timeouts, set `SYNC_TIMEOUT_MS=0`
- The sync interval uses standard cron syntax
- All numeric values should be provided as numbers (no quotes)

