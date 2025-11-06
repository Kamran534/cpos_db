require('dotenv').config();
const { localDb } = require('../../lib/sqlite');
const { remoteDb } = require('../../lib/db');
const { toRemote, toLocal } = require('./mappings');

// Sync configuration from environment variables
const SYNC_CONFIG = {
  // Batch sizes
  PULL_BATCH_SIZE: Number(process.env.SYNC_PULL_BATCH_SIZE || 500),
  PUSH_BATCH_SIZE: Number(process.env.SYNC_PUSH_BATCH_SIZE || 100),
  
  // Retry configuration
  MAX_RETRIES: Number(process.env.SYNC_MAX_RETRIES || 3),
  RETRY_DELAY_MS: Number(process.env.SYNC_RETRY_DELAY_MS || 5000),
  
  // Timeout configuration
  SYNC_TIMEOUT_MS: Number(process.env.SYNC_TIMEOUT_MS || 30000),
  
  // Queue configuration
  QUEUE_LIMIT: Number(process.env.SYNC_QUEUE_LIMIT || 100),
  QUEUE_PRIORITY_DEFAULT: Number(process.env.SYNC_QUEUE_PRIORITY_DEFAULT || 5),
  
  // Enable/disable sync
  SYNC_ENABLED: process.env.SYNC_ENABLED !== 'false',
  
  // Sync interval (cron schedule)
  SYNC_INTERVAL: process.env.SYNC_INTERVAL || '0 * * * *', // Default: hourly
  
  // Logging
  SYNC_LOG_ENABLED: process.env.SYNC_LOG_ENABLED !== 'false',
  
  // Models to sync (comma-separated or use default)
  SYNC_MODELS: process.env.SYNC_MODELS
    ? process.env.SYNC_MODELS.split(',').map(m => m.trim())
    : [
      // Parent models first (no dependencies)
      'TaxCategory', 'TaxRate', 'Category', 'Brand', 'CustomerGroup',
      'Location', 'Terminal', 'User',
      // Models with parents
      'Customer', 'Product', 'ProductVariant',
      // Inventory & stock (needs Location)
      'InventoryItem', 'StockAdjustment', 'StockAdjustmentLine', 'StockTransfer', 'StockTransferLine',
      // Shift (needs Location, Terminal, User)
      'Shift',
      // Orders & related (depend on Customer, Product, ProductVariant, Location, Terminal, User, Shift)
      'SaleOrder', 'SaleOrderLine', 'Payment', 'Discount',
      'ReturnOrder', 'ReturnOrderLine',
      // Other
      'ParkedOrder'
    ],
};

// Models to sync bidirectionally
const SYNC_MODELS = SYNC_CONFIG.SYNC_MODELS;

// Minimal per-model primary key field name map
const MODEL_PK = {
  CustomerGroup: 'id', Customer: 'id', Product: 'id', ProductVariant: 'id', SaleOrder: 'id', SaleOrderLine: 'id', Payment: 'id', Discount: 'id', ReturnOrder: 'id', ReturnOrderLine: 'id', Category: 'id', Brand: 'id', InventoryItem: 'id', StockAdjustment: 'id', StockAdjustmentLine: 'id', StockTransfer: 'id', StockTransferLine: 'id', ParkedOrder: 'id', Shift: 'id', TaxCategory: 'id', TaxRate: 'id', Location: 'id', Terminal: 'id', User: 'id'
};

// Utility to get prisma delegates by model name
function getDelegates(model) {
  const l = localDb[model.charAt(0).toLowerCase() + model.slice(1)];
  const r = remoteDb[model.charAt(0).toLowerCase() + model.slice(1)];
  return { local: l, remote: r };
}

async function getLastSyncAt() {
  // Store in LocalSettings key SYNC_LAST_TS
  const key = 'SYNC_LAST_TS';
  const row = await localDb.localSettings.findUnique({ where: { key } }).catch(() => null);
  return row ? new Date(row.value) : new Date(0);
}

async function setLastSyncAt(date = new Date()) {
  const key = 'SYNC_LAST_TS';
  const value = date.toISOString();
  await localDb.localSettings.upsert({ where: { key }, create: { key, value, category: 'SYNC' }, update: { value } });
}

async function pullOnce(options = {}) {
  if (!SYNC_CONFIG.SYNC_ENABLED) {
    return { processed: 0, failed: 0, models: {}, message: 'Sync is disabled' };
  }

  const stats = { processed: 0, failed: 0, models: {} };
  // If fullSync is true, pull all data from beginning of time
  const since = options.fullSync ? new Date(0) : await getLastSyncAt();
  const now = new Date();

  if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
    console.log(`[sync-pull] Starting ${options.fullSync ? 'FULL' : 'incremental'} pull sync from ${since.toISOString()}`);
  }
  
  // Build where filters per model, accounting for models without timestamp fields
  function buildSinceWhere(model, since) {
    switch (model) {
      case 'CustomerGroup':
      case 'Customer':
      case 'Product':
      case 'ProductVariant':
      case 'SaleOrder':
      case 'SaleOrderLine':
      case 'Payment':
      case 'Category':
      case 'Brand':
      case 'InventoryItem':
      case 'StockTransfer':
      case 'TaxCategory':
      case 'TaxRate':
      case 'Location':
      case 'User':
        return { updatedAt: { gt: since } };
      case 'Terminal':
        return { registeredAt: { gt: since } }; // Terminal uses registeredAt instead of updatedAt
      case 'Discount':
        return { createdAt: { gt: since } };
      case 'ReturnOrder':
        return { updatedAt: { gt: since } };
      case 'ReturnOrderLine':
        return { returnOrder: { updatedAt: { gt: since } } };
      case 'StockAdjustment':
        return { createdAt: { gt: since } }; // adjustedAt also available, createdAt is reliable
      case 'StockAdjustmentLine':
        return { adjustment: { adjustedAt: { gt: since } } };
      case 'StockTransferLine':
        return { transfer: { updatedAt: { gt: since } } };
      case 'ParkedOrder':
        return { parkedAt: { gt: since } };
      case 'Shift':
        return { openedAt: { gt: since } };
      default:
        return {}; // fallback: no filter
    }
  }

  // Sync models sequentially to respect foreign key dependencies
  for (const model of SYNC_MODELS) {
    const { local, remote } = getDelegates(model);
    if (!local || !remote) continue;
    try {
        // Remote changed since 'since'
        const where = buildSinceWhere(model, since);
        const remoteChanges = await remote.findMany({
          where,
          take: SYNC_CONFIG.PULL_BATCH_SIZE
        });
        let modelCount = 0;
        for (const row of remoteChanges) {
          try {
            const pk = MODEL_PK[model];
            let mapped = toLocal(model, row);

            // Strip common PostgreSQL-only fields that don't exist in SQLite schema
            const {
              // Common fields across multiple models
              storeId,
              sourceTerminalId,
              lastSyncedAt,
              lastModifiedBy,
              branchId,     // Location
              // Model-specific fields
              city,         // TaxRate
              style,        // ProductVariant
              material,     // ProductVariant
              currency,     // Payment
              authCode,     // Payment
              percent,      // Discount
              imageUrl,     // Category (exists in Product, but different schema in Category)
              logoUrl,      // Brand
              // Keep the rest
              ...cleanMapped
            } = mapped || {};
            mapped = cleanMapped;

            await local.upsert({ where: { [pk]: row[pk] }, create: mapped, update: mapped });
            modelCount++;
            stats.processed++;
          } catch (e) {
            // Handle unique constraint violations
            if (e.message && e.message.includes('Unique constraint failed')) {
              try {
                // For Terminal, try to find and update by apiKey
                if (model === 'Terminal' && row.apiKey) {
                  // Recreate mapped object
                  let retryMapped = toLocal(model, row);
                  const {
                    storeId, sourceTerminalId, lastSyncedAt, lastModifiedBy, branchId,
                    city, style, material, currency, authCode, percent, imageUrl, logoUrl,
                    ...cleanMapped
                  } = retryMapped || {};
                  retryMapped = cleanMapped;

                  const existing = await local.findFirst({ where: { apiKey: row.apiKey } });
                  if (existing) {
                    await local.update({ where: { id: existing.id }, data: retryMapped });
                    modelCount++;
                    stats.processed++;
                    if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
                      console.log(`[sync-pull] Updated existing ${model} with apiKey ${row.apiKey}`);
                    }
                    continue;
                  }
                }
                // If we can't handle it, log and count as failed
                stats.failed++;
                if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
                  console.error(`[pull] Failed to sync ${model} ${row[MODEL_PK[model]]}:`, e.message);
                }
              } catch (retryError) {
                stats.failed++;
                if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
                  console.error(`[pull] Failed to sync ${model} ${row[MODEL_PK[model]]}:`, retryError.message);
                }
              }
            } else {
              stats.failed++;
              if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
                console.error(`[pull] Failed to sync ${model} ${row[MODEL_PK[model]]}:`, e.message);
              }
            }
          }
        }
        stats.models[model] = modelCount;
        if (SYNC_CONFIG.SYNC_LOG_ENABLED && modelCount > 0) {
          console.log(`[sync-pull] Synced ${modelCount} ${model} records`);
        }
    } catch (e) {
      if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
        console.error(`[pull] Failed to fetch ${model}:`, e.message);
      }
    }
  }
  await setLastSyncAt(now);
  
  if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
    console.log(`[sync-pull] Completed: ${stats.processed} processed, ${stats.failed} failed`);
  }
  
  return stats;
}

async function pushOnce() {
  if (!SYNC_CONFIG.SYNC_ENABLED) {
    return { processed: 0, failed: 0, models: {}, message: 'Sync is disabled' };
  }
  
  const stats = { processed: 0, failed: 0, models: {} };
  // Use SyncQueue table in local to push changes
  const queue = await localDb.syncQueue.findMany({ 
    where: { status: 'PENDING' }, 
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }], 
    take: SYNC_CONFIG.PUSH_BATCH_SIZE 
  });
  
  if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
    console.log(`[sync-push] Processing ${queue.length} pending items`);
  }
  
  for (const item of queue) {
    // Check retry limit
    if (item.attemptCount >= SYNC_CONFIG.MAX_RETRIES) {
      await localDb.syncQueue.update({ 
        where: { id: item.id }, 
        data: { 
          status: 'FAILED', 
          errorMessage: `Max retries (${SYNC_CONFIG.MAX_RETRIES}) exceeded`,
          lastAttemptAt: new Date() 
        } 
      });
      stats.failed++;
      continue;
    }
    
    try {
      const { entityType, entityId, operation, data } = item;
      const model = entityType;
      const { remote } = getDelegates(model);
      if (!remote) {
        await localDb.syncQueue.update({ 
          where: { id: item.id }, 
          data: { 
            status: 'FAILED', 
            errorMessage: 'No remote delegate', 
            attemptCount: { increment: 1 }, 
            lastAttemptAt: new Date() 
          } 
        });
        stats.failed++;
        continue;
      }
      const payload = toRemote(model, JSON.parse(data));
      const pk = MODEL_PK[model];
      
      // Execute operation with timeout
      const operationPromise = (async () => {
        if (operation === 'CREATE') {
          await remote.upsert({ where: { [pk]: payload[pk] }, create: payload, update: payload });
        } else if (operation === 'UPDATE') {
          await remote.update({ where: { [pk]: payload[pk] }, data: payload });
        } else if (operation === 'DELETE') {
          await remote.delete({ where: { [pk]: payload[pk] } });
        }
      })();
      
      // Add timeout if configured
      if (SYNC_CONFIG.SYNC_TIMEOUT_MS > 0) {
        await Promise.race([
          operationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), SYNC_CONFIG.SYNC_TIMEOUT_MS)
          )
        ]);
      } else {
        await operationPromise;
      }
      
      await localDb.syncQueue.update({ 
        where: { id: item.id }, 
        data: { 
          status: 'COMPLETED', 
          processedAt: new Date(), 
          errorMessage: null 
        } 
      });
      stats.processed++;
      stats.models[model] = (stats.models[model] || 0) + 1;
    } catch (e) {
      const attemptCount = item.attemptCount + 1;
      await localDb.syncQueue.update({ 
        where: { id: item.id }, 
        data: { 
          status: attemptCount >= SYNC_CONFIG.MAX_RETRIES ? 'FAILED' : 'PENDING',
          errorMessage: e.message, 
          attemptCount: attemptCount, 
          lastAttemptAt: new Date() 
        } 
      });
      stats.failed++;
      if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
        console.error(`[push] Failed to sync ${item.entityType} ${item.entityId}:`, e.message);
      }
    }
  }
  
  if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
    console.log(`[sync-push] Completed: ${stats.processed} processed, ${stats.failed} failed`);
  }
  
  return stats;
}

async function runSyncBoth(options = {}) {
  const pushStats = await pushOnce();
  const pullStats = await pullOnce(options);
  return { push: pushStats, pull: pullStats };
}

// Unified sync entrypoint; keeps push/pull internal
async function runSync(operation = 'both', options = {}) {
  if (operation === 'push') {
    return await pushOnce();
  }
  if (operation === 'pull') {
    return await pullOnce(options);
  }
  return await runSyncBoth(options);
}

async function getSyncStatus() {
  try {
    const lastSync = await getLastSyncAt();
    const pending = await localDb.syncQueue.count({ where: { status: 'PENDING' } });
    const failed = await localDb.syncQueue.count({ where: { status: 'FAILED' } });
    const completed = await localDb.syncQueue.count({ where: { status: 'COMPLETED' } });
    return { lastSyncAt: lastSync, pending, failed, completed };
  } catch (e) {
    console.error('[getSyncStatus] Error accessing SQLite database:', e.message);
    throw new Error(`Failed to get sync status: ${e.message}. Make sure the SQLite database file exists and is accessible.`);
  }
}

async function getPendingQueue(filters = {}) {
  try {
    const { status = 'PENDING', limit = SYNC_CONFIG.QUEUE_LIMIT, offset = 0 } = filters;
    const where = status === 'ALL' ? {} : { status };
    const maxLimit = Math.min(limit, SYNC_CONFIG.QUEUE_LIMIT * 5); // Allow up to 5x default limit
    const items = await localDb.syncQueue.findMany({ 
      where, 
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }], 
      take: maxLimit, 
      skip: offset 
    });
    const total = await localDb.syncQueue.count({ where });
    return { items, total, limit: maxLimit, offset };
  } catch (e) {
    console.error('[getPendingQueue] Error accessing SQLite database:', e.message);
    throw new Error(`Failed to access sync queue: ${e.message}. Make sure the SQLite database file exists and is accessible.`);
  }
}

module.exports = { 
  runSync,
  runSyncBoth, 
  getSyncStatus, 
  getPendingQueue,
  SYNC_CONFIG 
};


