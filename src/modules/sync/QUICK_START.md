# Sync Module - Quick Start Guide

Complete guide to using the Sync API endpoints with priorities, timing, and best practices.

## Table of Contents

- [Overview](#overview)
- [API Endpoints](#api-endpoints)
- [Sync Priorities](#sync-priorities)
- [Timing & Intervals](#timing--intervals)
- [Auto-Sync on Server Restart](#auto-sync-on-server-restart)
- [Status Monitoring](#status-monitoring)
- [Best Practices](#best-practices)

---

## Overview

The Sync Module provides bidirectional synchronization between terminals (SQLite) and the central server (PostgreSQL). All sync operations are handled through REST API endpoints.

**Base URL**: `http://your-server:4000/api/sync`

**Authentication**: Bearer token (required for all endpoints)

---

## API Endpoints

### 1. Push Changes (Terminal → Central)

**Endpoint**: `POST /api/sync/push`

**Description**: Terminal sends local changes (orders, inventory, etc.) to central server.

**Priority**: Based on `syncPriority` in change data (see [Sync Priorities](#sync-priorities))

**When to Call**:
- Immediately after creating/updating critical entities (Orders, Payments)
- Periodically for medium/low priority items
- On-demand when user triggers manual sync

**Request**:
```http
POST /api/sync/push
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "terminalId": "terminal-123",
  "changes": [
    {
      "entityType": "SaleOrder",
      "entityId": "order-456",
      "operation": "CREATE",
      "data": {
        "id": "order-456",
        "total": 150.00,
        "status": "COMPLETED",
        ...
      },
      "syncVersion": 1
    },
    {
      "entityType": "InventoryItem",
      "entityId": "inv-789",
      "operation": "UPDATE",
      "data": {
        "quantityOnHand": 50,
        ...
      },
      "syncVersion": 2
    }
  ]
}
```

**Response**:
```json
{
  "results": [
    {
      "entityType": "SaleOrder",
      "entityId": "order-456",
      "success": true,
      "error": null,
      "conflict": false,
      "newSyncVersion": 1
    },
    {
      "entityType": "InventoryItem",
      "entityId": "inv-789",
      "success": false,
      "error": "Version conflict",
      "conflict": true,
      "centralData": { ... }
    }
  ]
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
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
  }'
```

---

### 2. Pull Changes (Central → Terminal)

**Endpoint**: `GET /api/sync/pull`

**Description**: Terminal requests updates from central server for specific entity type.

**Priority**: Based on entity type (see [Sync Priorities](#sync-priorities))

**When to Call**:
- On startup to get latest data
- Periodically based on `syncInterval` (default: 300 seconds = 5 minutes)
- After successful push to get updated data
- When triggered by server via socket.io

**Request**:
```http
GET /api/sync/pull?terminalId=terminal-123&entityType=Product&lastSync=2024-01-01T00:00:00Z
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters**:
- `terminalId` (required): Terminal identifier
- `entityType` (required): One of: `Product`, `Customer`, `InventoryItem`, `SaleOrder`, `Category`, `Brand`, `TaxCategory`
- `lastSync` (required): ISO 8601 timestamp of last successful sync

**Response**:
```json
[
  {
    "id": "product-123",
    "data": {
      "id": "product-123",
      "name": "Updated Product Name",
      "price": 29.99,
      ...
    },
    "syncVersion": 5
  },
  ...
]
```

**Example with cURL**:
```bash
curl -X GET "http://localhost:4000/api/sync/pull?terminalId=terminal-123&entityType=Product&lastSync=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Best Practice**: Call for each entity type separately, starting with highest priority:
1. Product (for pricing updates)
2. InventoryItem (for stock levels)
3. Customer (for customer data)
4. Category, Brand, TaxCategory (reference data)

---

### 3. Resolve Conflict

**Endpoint**: `POST /api/sync/resolve`

**Description**: Resolve a conflict between terminal and central data.

**Priority**: HIGH - Resolve conflicts immediately to prevent data inconsistency

**When to Call**: As soon as a conflict is detected (from push response)

**Request**:
```http
POST /api/sync/resolve
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "conflictId": "conflict-789",
  "resolvedData": {
    "id": "order-456",
    "total": 150.00,
    "status": "COMPLETED",
    ...
  },
  "resolution": "TERMINAL_WINS"
}
```

**Resolution Options**:
- `TERMINAL_WINS`: Terminal data takes precedence
- `CENTRAL_WINS`: Central data takes precedence
- `MANUAL_MERGE`: Requires manual intervention (data merged manually)

**Response**:
```json
{
  "success": true
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/sync/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "conflictId": "conflict-789",
    "resolvedData": { ... },
    "resolution": "TERMINAL_WINS"
  }'
```

---

### 4. Heartbeat

**Endpoint**: `POST /api/sync/heartbeat`

**Description**: Terminal sends periodic heartbeat to indicate it's online and update status.

**Priority**: LOW - Background operation

**When to Call**: Every 30-60 seconds to keep terminal status updated

**Request**:
```http
POST /api/sync/heartbeat
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "terminalId": "terminal-123",
  "status": "ONLINE"
}
```

**Status Options**:
- `ONLINE`: Terminal is online and operational
- `OFFLINE`: Terminal is offline
- `SYNCING`: Terminal is currently syncing
- `MAINTENANCE`: Terminal is in maintenance mode

**Response**:
```json
{
  "success": true
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:4000/api/sync/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "terminalId": "terminal-123",
    "status": "ONLINE"
  }'
```

---

### 5. Trigger Full Sync

**Endpoint**: `POST /api/sync/all`

**Description**: Triggers a complete sync operation (both push and pull) for a terminal or all terminals.

**Priority**: HIGH - Use when manual sync is needed

**When to Call**:
- After server restart (automatically called)
- When manual sync is requested by admin
- After resolving multiple conflicts
- When terminal comes back online after being offline

**Request - Single Terminal**:
```http
POST /api/sync/all
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "terminalId": "terminal-123"
}
```

**Request - All Terminals**:
```http
POST /api/sync/all
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "allTerminals": true
}
```

**Response**:
```json
{
  "success": true,
  "terminalId": "terminal-123",
  "pull": {
    "results": [
      {
        "entityType": "Product",
        "count": 150,
        "success": true
      },
      {
        "entityType": "Customer",
        "count": 80,
        "success": true
      },
      ...
    ],
    "totalEntities": 500
  },
  "message": "Full sync triggered. Terminal should now push changes and pull updates."
}
```

**Example with cURL**:
```bash
# Single terminal
curl -X POST http://localhost:4000/api/sync/all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"terminalId": "terminal-123"}'

# All terminals
curl -X POST http://localhost:4000/api/sync/all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"allTerminals": true}'
```

**Note**: This endpoint also sends a socket.io event (`sync:trigger`) to notify the terminal to start syncing.

---

### 6. Get Sync Status

**Endpoint**: `GET /api/sync/status`

**Description**: Get sync status with counts for pending, failed, and synced tables.

**Priority**: LOW - Monitoring/administrative endpoint

**When to Call**:
- Periodically for monitoring (every 5-10 minutes)
- When checking sync health
- For dashboard/UI display

**Request - All Terminals**:
```http
GET /api/sync/status
Authorization: Bearer YOUR_TOKEN
```

**Request - Specific Terminal**:
```http
GET /api/sync/status?terminalId=terminal-123
Authorization: Bearer YOUR_TOKEN
```

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
    "Customer": {
      "pending": 5,
      "failed": 0,
      "synced": 80,
      "conflicts": 0
    },
    "InventoryItem": {
      "pending": 3,
      "failed": 1,
      "synced": 200,
      "conflicts": 0
    },
    "SaleOrder": {
      "pending": 0,
      "failed": 0,
      "synced": 500,
      "conflicts": 0
    },
    "Category": {
      "pending": 0,
      "failed": 0,
      "synced": 25,
      "conflicts": 0
    },
    "Brand": {
      "pending": 0,
      "failed": 0,
      "synced": 15,
      "conflicts": 0
    },
    "TaxCategory": {
      "pending": 0,
      "failed": 0,
      "synced": 5,
      "conflicts": 0
    }
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

**Example with cURL**:
```bash
# All terminals
curl -X GET http://localhost:4000/api/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Specific terminal
curl -X GET "http://localhost:4000/api/sync/status?terminalId=terminal-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Sync Priorities

Sync priorities determine the order and frequency of sync operations. Higher priority items are synced more frequently and immediately.

### Priority Levels

| Priority | Value | Entity Types | Sync Frequency |
|----------|-------|--------------|----------------|
| **CRITICAL** | 10 | SaleOrder (completed), Payment | Immediate, every sync cycle |
| **HIGH** | 8-9 | SaleOrder (pending), InventoryItem | Every sync cycle, within 1-2 minutes |
| **MEDIUM** | 5-7 | Customer, Product, ProductVariant | Every 2-3 sync cycles, within 5-10 minutes |
| **LOW** | 3-4 | Category, Brand | Every 5+ sync cycles, within 15-30 minutes |
| **BACKGROUND** | 1 | Historical data, logs | On-demand or during low activity |

### Priority Assignment

**Automatic Priority** (based on entity type):
```typescript
// Priority is automatically assigned based on entity type
SaleOrder (completed) → 10 (CRITICAL)
SaleOrder (pending)   → 8 (HIGH)
Payment               → 10 (CRITICAL)
InventoryItem         → 9 (HIGH)
Customer              → 7 (MEDIUM)
Product               → 6 (MEDIUM)
Category              → 4 (LOW)
Brand                 → 4 (LOW)
TaxCategory           → 3 (LOW)
```

**Manual Priority** (in push request):
```json
{
  "entityType": "SaleOrder",
  "entityId": "order-456",
  "operation": "CREATE",
  "data": { ... },
  "syncVersion": 1,
  "syncPriority": 10  // Override default priority
}
```

### Priority-Based Sync Strategy

1. **CRITICAL (10)**: Sync immediately, retry on failure
2. **HIGH (8-9)**: Sync in next cycle, retry up to 3 times
3. **MEDIUM (5-7)**: Sync in next 2-3 cycles, retry up to 2 times
4. **LOW (3-4)**: Sync when system is idle, retry once
5. **BACKGROUND (1)**: Sync on-demand only

---

## Timing & Intervals

### Default Sync Intervals

| Configuration | Default | Description |
|---------------|---------|-------------|
| `syncInterval` | 300 seconds (5 minutes) | Periodic sync interval |
| `heartbeatInterval` | 30-60 seconds | Terminal heartbeat frequency |
| `batchSize` | 50 | Number of entities per batch |
| `maxRetries` | 3 | Maximum retry attempts |
| `retryDelay` | 1000ms (1 second) | Delay between retries |

### Sync Timing Recommendations

**Terminal Side**:
- **Heartbeat**: Every 30-60 seconds
- **Critical Items**: Push immediately after creation
- **High Priority**: Push within 1-2 minutes
- **Medium Priority**: Push every 5-10 minutes
- **Low Priority**: Push every 15-30 minutes
- **Pull Operations**: Every 5 minutes (or based on `syncInterval`)

**Server Side**:
- **Auto-sync on Restart**: 2 seconds after server starts
- **Status Check**: Every 5-10 minutes (for monitoring)
- **Conflict Resolution**: As soon as detected

### Example Sync Schedule

```
00:00 - Full sync (if needed)
00:05 - Pull Product updates
00:10 - Pull InventoryItem updates
00:15 - Pull Customer updates
00:20 - Push pending high-priority items
00:25 - Pull Category, Brand updates
00:30 - Push pending medium-priority items
... (repeat every 5 minutes)
```

---

## Auto-Sync on Server Restart

The server automatically triggers sync for all active terminals when it restarts.

### How It Works

1. Server starts and initializes
2. After 2 seconds delay (to ensure everything is ready)
3. Finds all active terminals (status: ONLINE or OFFLINE)
4. Sends socket.io `sync:trigger` event to each terminal
5. Terminals receive event and start full sync

### Socket.io Events

**Terminal Registration**:
```javascript
// Terminal connects and registers
socket.emit('terminal:register', {
  terminalId: 'terminal-123'
});
```

**Server Triggers Sync**:
```javascript
// Server sends sync trigger
socket.on('sync:trigger', (data) => {
  console.log('Sync triggered:', data);
  // data: { type: 'FULL', terminalId: '...', timestamp: '...', reason: 'SERVER_RESTART' }
  
  // Terminal should now:
  // 1. Push all pending changes
  // 2. Pull all entity types
  // 3. Resolve any conflicts
});
```

**Terminal Acknowledgment**:
```javascript
// Terminal acknowledges sync trigger
socket.emit('sync:ack', {
  terminalId: 'terminal-123',
  type: 'FULL'
});
```

### Disabling Auto-Sync

To disable auto-sync on restart, comment out the auto-sync call in `src/server.ts`:
```typescript
// setTimeout(() => {
//   autoSyncOnStartup();
// }, 2000);
```

---

## Status Monitoring

### Monitoring Sync Health

Use the `/api/sync/status` endpoint to monitor sync health:

**Key Metrics to Watch**:
- **Pending Count**: Should be low (< 50 for normal operation)
- **Failed Count**: Should be 0 (investigate if > 0)
- **Conflicts**: Should be resolved quickly
- **Synced Count**: Should increase over time

**Alert Thresholds**:
- ⚠️ **Warning**: `pending > 100` or `failed > 5`
- 🚨 **Critical**: `pending > 500` or `failed > 20` or `conflicts > 10`

### Example Monitoring Script

```bash
#!/bin/bash
# monitor-sync.sh

while true; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:4000/api/sync/status)
  
  PENDING=$(echo $STATUS | jq '.totals.pending')
  FAILED=$(echo $STATUS | jq '.totals.failed')
  CONFLICTS=$(echo $STATUS | jq '.totals.conflicts')
  
  if [ $PENDING -gt 100 ] || [ $FAILED -gt 5 ]; then
    echo "⚠️  WARNING: Pending=$PENDING, Failed=$FAILED"
  fi
  
  if [ $CONFLICTS -gt 10 ]; then
    echo "🚨 CRITICAL: $CONFLICTS conflicts need resolution"
  fi
  
  sleep 300  # Check every 5 minutes
done
```

---

## Best Practices

### 1. Push Operations

✅ **Do**:
- Push critical items (orders, payments) immediately
- Batch multiple changes together (up to 50 per request)
- Include proper `syncVersion` to detect conflicts
- Handle conflicts immediately

❌ **Don't**:
- Push the same change multiple times
- Push without checking for conflicts
- Ignore failed push responses

### 2. Pull Operations

✅ **Do**:
- Pull high-priority entities first (Product, InventoryItem)
- Use accurate `lastSync` timestamp
- Pull each entity type separately
- Handle empty responses gracefully

❌ **Don't**:
- Pull all entity types in one request
- Use incorrect `lastSync` timestamp
- Ignore pull errors

### 3. Conflict Resolution

✅ **Do**:
- Resolve conflicts immediately
- Use appropriate resolution strategy:
  - `TERMINAL_WINS` for orders (terminal is source of truth)
  - `CENTRAL_WINS` for inventory (prevent overselling)
  - `MANUAL_MERGE` for complex conflicts
- Log all conflict resolutions

❌ **Don't**:
- Leave conflicts unresolved
- Use wrong resolution strategy
- Ignore conflict notifications

### 4. Error Handling

✅ **Do**:
- Implement retry logic with exponential backoff
- Log all sync errors
- Notify users of critical sync failures
- Monitor sync status regularly

❌ **Don't**:
- Retry indefinitely
- Ignore sync errors
- Skip error logging

### 5. Performance

✅ **Do**:
- Batch operations (50 items per batch)
- Use appropriate priorities
- Sync during low-traffic periods when possible
- Monitor sync performance

❌ **Don't**:
- Sync too frequently (waste resources)
- Sync too infrequently (data becomes stale)
- Sync everything at once (overload server)

---

## Complete Example Workflow

### Terminal Startup Sequence

```javascript
// 1. Connect to server
const socket = io('http://central-server:4000');

// 2. Register terminal
socket.emit('terminal:register', { terminalId: 'terminal-123' });

// 3. Send heartbeat
setInterval(() => {
  fetch('/api/sync/heartbeat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      terminalId: 'terminal-123',
      status: 'ONLINE'
    })
  });
}, 30000); // Every 30 seconds

// 4. Listen for sync triggers
socket.on('sync:trigger', async (data) => {
  console.log('Sync triggered:', data);
  
  // 5. Pull all entity types
  const entityTypes = ['Product', 'Customer', 'InventoryItem', 'SaleOrder'];
  for (const entityType of entityTypes) {
    const lastSync = await getLastSyncTime(entityType);
    const changes = await fetch(
      `/api/sync/pull?terminalId=terminal-123&entityType=${entityType}&lastSync=${lastSync}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    await applyChanges(changes);
  }
  
  // 6. Push pending changes
  const pendingChanges = await getPendingChanges();
  if (pendingChanges.length > 0) {
    const result = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        terminalId: 'terminal-123',
        changes: pendingChanges
      })
    });
    
    // 7. Resolve any conflicts
    const conflicts = result.results.filter(r => r.conflict);
    for (const conflict of conflicts) {
      await resolveConflict(conflict);
    }
  }
  
  // 8. Acknowledge sync
  socket.emit('sync:ack', {
    terminalId: 'terminal-123',
    type: data.type
  });
});
```

---

## Troubleshooting

### Common Issues

**1. Sync not working**
- Check server logs for errors
- Verify database connections
- Check authentication token
- Verify terminal is registered

**2. Conflicts piling up**
- Review conflict resolution strategy
- Resolve conflicts manually if needed
- Check for version mismatches

**3. Slow sync**
- Reduce batch size
- Increase sync interval
- Check network connectivity
- Monitor server performance

**4. Connection errors**
- Verify `CENTRAL_API_URL` is correct
- Check network connectivity
- Verify firewall rules
- Check SSL certificates

---

## API Summary Table

| Endpoint | Method | Priority | Frequency | Purpose |
|----------|--------|----------|-----------|---------|
| `/push` | POST | Based on entity | As needed | Send changes to server |
| `/pull` | GET | Based on entity | Every 5 min | Get updates from server |
| `/resolve` | POST | HIGH | As needed | Resolve conflicts |
| `/heartbeat` | POST | LOW | Every 30-60s | Update terminal status |
| `/all` | POST | HIGH | On-demand | Trigger full sync |
| `/status` | GET | LOW | Every 5-10 min | Monitor sync health |

---

## Additional Resources

- **Full Documentation**: See `README.md` for detailed architecture
- **API Docs**: Visit `http://your-server:4000/api-docs` for Swagger documentation
- **Source Code**: Check `src/modules/sync/` for implementation details

---

**Last Updated**: 2025
**Version**: 1.0.0

