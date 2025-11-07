# Sync Module - SQLite ↔ PostgreSQL

Complete bidirectional synchronization between terminal (SQLite) and central server (PostgreSQL) with automatic sync on server restart, real-time status monitoring, and priority-based sync operations.

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Complete API reference with examples, priorities, timing, and best practices
- **This README** - Architecture, setup, and overview

## Architecture

```
Terminal (SQLite)          Central Server (PostgreSQL)
     │                              │
     ├─ Outbox (Queue)              ├─ Sync API Routes
     ├─ SyncService                 ├─ CentralSyncService
     ├─ PushService                 ├─ Auto-Sync on Restart
     ├─ PullService                 ├─ Socket.io Integration
     └─ ConflictResolver            └─ Conflict Resolution
```

## Features

- ✅ **Bidirectional Sync** - Push and pull changes between terminal and central server
- ✅ **Auto-Sync on Restart** - Automatically triggers sync for all terminals when server restarts
- ✅ **Priority-Based Sync** - Critical items sync immediately, low-priority items sync on schedule
- ✅ **Real-Time Status** - Monitor pending, failed, synced, and conflict counts per table
- ✅ **Socket.io Integration** - Real-time sync triggers and terminal notifications
- ✅ **Conflict Resolution** - Automatic conflict detection and resolution strategies
- ✅ **Heartbeat Monitoring** - Track terminal status and connectivity

## Quick Start

### Terminal Side (Local SQLite)

```typescript
import { SyncService } from './sync/core/SyncService.js';
import { CentralApiService } from './sync/api/CentralApiService.js';
import { localDb } from './lib/sqlite.js';

// Initialize sync service
const centralApi = new CentralApiService('https://central-server.com', 'api-key');
const syncConfig = {
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
  syncInterval: 300, // 5 minutes
  conflictStrategy: 'TERMINAL_WINS' as const
};

const syncService = new SyncService(localDb, centralApi, syncConfig);
await syncService.initialize('terminal-id');

// Perform full sync
await syncService.performFullSync();

// Perform incremental sync (high priority only)
await syncService.performIncrementalSync();
```

### Central Server Side (PostgreSQL)

The sync routes are automatically integrated in `src/routes/index.ts`. All endpoints are available at `/api/sync/*`.

**Available Endpoints**:
- `POST /api/sync/push` - Terminal sends changes to central server
- `GET /api/sync/pull` - Terminal requests changes from central server
- `POST /api/sync/resolve` - Resolve sync conflicts
- `POST /api/sync/heartbeat` - Terminal status update
- `POST /api/sync/all` - Trigger full sync (push + pull) for terminal(s)
- `GET /api/sync/status` - Get sync status with counts per table

See [QUICK_START.md](./QUICK_START.md) for detailed API documentation with examples.

## Usage Examples

### Creating an Order (Auto-sync)

```typescript
// Create order locally
const order = await localDb.saleOrder.create({
  data: orderData
});

// Automatically queue for sync
await localDb.outbox.create({
  data: {
    terminalId: 'terminal-id',
    entityType: 'SaleOrder',
    entityId: order.id,
    operation: 'CREATE',
    data: order,
    syncPriority: 10, // CRITICAL
    createdInMode: 'ONLINE'
  }
});

// Trigger immediate sync for high-priority items
await syncService.performIncrementalSync();
```

### Manual Sync Trigger

```typescript
// Full sync (all entities)
const result = await syncService.performFullSync();
console.log(`Synced: ${result.pushed} pushed, ${result.pulled} pulled`);

// Incremental sync (high priority only)
await syncService.performIncrementalSync();
```

## Sync Priorities

- **CRITICAL (10)**: Orders, Payments
- **HIGH (8)**: Inventory, Customers
- **MEDIUM (5)**: Products, Categories
- **LOW (3)**: Reference data

## Conflict Resolution

Conflicts are automatically detected and resolved based on strategy:

- **TERMINAL_WINS**: Terminal data takes precedence
- **CENTRAL_WINS**: Central data takes precedence
- **MANUAL_MERGE**: Requires manual intervention

## Entity Sync Strategies

Each entity type has a custom sync strategy:

- **ProductSync**: Always sync, prefer central pricing
- **OrderSync**: Terminal wins (source of truth)
- **InventorySync**: Central wins (prevent overselling)
- **CustomerSync**: Merge loyalty points and spending

## Configuration

Set environment variables:

```bash
# Terminal
DATABASE_URL=file:./prisma/cpos.db
CENTRAL_API_URL=https://central-server.com
CENTRAL_API_KEY=your-api-key

# Central Server
POSTGRES_URL_REMOTE=postgresql://user:pass@host:5432/db
```

## API Endpoints

### 1. Push Changes (Terminal → Central)
```http
POST /api/sync/push
Content-Type: application/json

{
  "terminalId": "terminal-123",
  "changes": [
    {
      "entityType": "SaleOrder",
      "entityId": "order-456",
      "operation": "CREATE",
      "data": { ... },
      "syncVersion": 1
    }
  ]
}
```

### 2. Pull Changes (Central → Terminal)
```http
GET /api/sync/pull?terminalId=terminal-123&entityType=Product&lastSync=2024-01-01T00:00:00Z
```

### 3. Resolve Conflict
```http
POST /api/sync/resolve
Content-Type: application/json

{
  "conflictId": "conflict-789",
  "resolvedData": { ... },
  "resolution": "TERMINAL_WINS"
}
```

### 4. Heartbeat
```http
POST /api/sync/heartbeat
Content-Type: application/json

{
  "terminalId": "terminal-123",
  "status": "ONLINE"
}
```

### 5. Trigger Full Sync (NEW)
```http
POST /api/sync/all
Content-Type: application/json

# Single terminal
{
  "terminalId": "terminal-123"
}

# All terminals
{
  "allTerminals": true
}
```

### 6. Get Sync Status (NEW)
```http
GET /api/sync/status?terminalId=terminal-123
```

Returns sync status with counts for pending, failed, synced, and conflicts per table.

**Response**:
```json
{
  "terminalId": "terminal-123",
  "tables": {
    "Product": {
      "pending": 10,
      "failed": 2,
      "synced": 150,
      "conflicts": 1
    },
    ...
  },
  "totals": {
    "pending": 18,
    "failed": 3,
    "synced": 975,
    "conflicts": 1
  },
  "summary": {
    "totalTables": 7,
    "tablesWithPending": 3,
    "tablesWithFailed": 2,
    "tablesWithSynced": 7,
    "tablesWithConflicts": 1
  }
}
```

For complete API documentation with examples, priorities, and timing, see [QUICK_START.md](./QUICK_START.md).

## Auto-Sync on Server Restart

The server automatically triggers sync for all active terminals when it restarts.

**How it works**:
1. Server starts and initializes (2 second delay)
2. Finds all active terminals (status: ONLINE or OFFLINE)
3. Sends socket.io `sync:trigger` event to each terminal
4. Terminals receive event and start full sync

**Socket.io Events**:
- `terminal:register` - Terminal registers for sync notifications
- `sync:trigger` - Server triggers sync (sent on restart or via API)
- `sync:ack` - Terminal acknowledges sync trigger

To disable auto-sync, comment out the auto-sync call in `src/server.ts`.

## Socket.io Integration

Terminals can connect via Socket.io to receive real-time sync triggers:

```javascript
// Terminal connects
const socket = io('http://central-server:4000');

// Register terminal
socket.emit('terminal:register', { terminalId: 'terminal-123' });

// Listen for sync triggers
socket.on('sync:trigger', (data) => {
  // data: { type: 'FULL', terminalId: '...', timestamp: '...', reason: 'SERVER_RESTART' }
  // Start sync process...
});

// Acknowledge sync
socket.emit('sync:ack', { terminalId: 'terminal-123', type: 'FULL' });
```

## Monitoring

### Sync Status API
Use the `/api/sync/status` endpoint to monitor sync health:
- **Pending**: Items waiting to sync
- **Failed**: Failed sync operations
- **Synced**: Successfully synced items
- **Conflicts**: Pending conflicts

### Sync Logs
Sync status is logged via `SyncLogger`:
- Info: Normal sync operations
- Warn: Retries and conflicts
- Error: Failed syncs

Check sync history:
```typescript
const history = await localDb.syncHistory.findMany({
  orderBy: { startedAt: 'desc' },
  take: 10
});
```

### Monitoring Best Practices
- Check `/api/sync/status` every 5-10 minutes
- Alert when `pending > 100` or `failed > 5`
- Resolve conflicts immediately
- Monitor terminal heartbeat status

## Sync Priorities

Sync priorities determine the order and frequency of sync operations:

| Priority | Value | Entity Types | Sync Frequency |
|----------|-------|--------------|----------------|
| **CRITICAL** | 10 | SaleOrder (completed), Payment | Immediate |
| **HIGH** | 8-9 | SaleOrder (pending), InventoryItem | Every sync cycle |
| **MEDIUM** | 5-7 | Customer, Product | Every 2-3 cycles |
| **LOW** | 3-4 | Category, Brand | Every 5+ cycles |
| **BACKGROUND** | 1 | Historical data | On-demand |

See [QUICK_START.md](./QUICK_START.md) for detailed priority information.

## Troubleshooting

1. **Sync not working**: 
   - Check database connections in server startup console
   - Verify terminal is registered and online
   - Check authentication token

2. **Conflicts piling up**: 
   - Review conflict resolution strategy
   - Use `/api/sync/status` to identify conflicts
   - Resolve conflicts via `/api/sync/resolve`

3. **Slow sync**: 
   - Adjust `batchSize` and `syncInterval` in config
   - Check network connectivity
   - Monitor server performance

4. **Connection errors**: 
   - Verify `CENTRAL_API_URL` and network connectivity
   - Check firewall rules
   - Verify SSL certificates

5. **Auto-sync not working**:
   - Check server logs for auto-sync messages
   - Verify terminals are active (status: ONLINE or OFFLINE)
   - Check socket.io connection

## Additional Resources

- **[QUICK_START.md](./QUICK_START.md)** - Complete API reference with examples
- **Swagger Docs**: Visit `http://your-server:4000/api-docs` for interactive API documentation
- **Source Code**: Check `src/modules/sync/` for implementation details

