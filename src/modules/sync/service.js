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

// Optional defaults for remote-required relations when pushing from local
const DEFAULT_IDS = {
  STORE_ID: process.env.DEFAULT_STORE_ID || process.env.SEED_STORE_ID || null,
  BRANCH_ID: process.env.DEFAULT_BRANCH_ID || process.env.SEED_BRANCH_ID || null,
};

async function ensureDefaultIds() {
  try {
    if (!DEFAULT_IDS.STORE_ID) {
      const s = await remoteDb.store.findFirst({ select: { id: true } });
      if (s?.id) DEFAULT_IDS.STORE_ID = s.id;
    }
  } catch (_) {}
  try {
    if (!DEFAULT_IDS.BRANCH_ID) {
      const b = await remoteDb.branch.findFirst({ select: { id: true } });
      if (b?.id) DEFAULT_IDS.BRANCH_ID = b.id;
    }
  } catch (_) {}
}

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
              // Remote-only user fields
              permissions,
              mustChangePassword,
              refreshToken,
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
  
  // Fallback: also push unsynced local records even if not enqueued
  await ensureDefaultIds();
  // Heuristic: rows with pendingSync=true OR syncStatus='PENDING' OR lastSyncedAt IS NULL
  for (const model of SYNC_MODELS) {
    const { local, remote } = getDelegates(model);
    if (!local || !remote) continue;
    try {
      const pk = MODEL_PK[model];
      let candidates = [];
      // Try by pendingSync
      try {
        candidates = await local.findMany({ where: { pendingSync: true }, take: SYNC_CONFIG.PUSH_BATCH_SIZE });
      } catch (_) {}
      // If none, try by syncStatus
      if (candidates.length === 0) {
        try {
          candidates = await local.findMany({ where: { syncStatus: 'PENDING' }, take: SYNC_CONFIG.PUSH_BATCH_SIZE });
        } catch (_) {}
      }
      // If none, try by lastSyncedAt null
      if (candidates.length === 0) {
        try {
          candidates = await local.findMany({ where: { lastSyncedAt: null }, take: SYNC_CONFIG.PUSH_BATCH_SIZE });
        } catch (_) {}
      }
      // If still none, try updated since watermark
      if (candidates.length === 0) {
        try {
          const since = await getLastSyncAt();
          candidates = await local.findMany({ where: { updatedAt: { gt: since } }, take: SYNC_CONFIG.PUSH_BATCH_SIZE });
        } catch (_) {}
      }
      if (candidates.length === 0) continue;
      if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
        console.log(`[sync-push] ${model}: found ${candidates.length} unsynced records`);
      }
      for (const row of candidates) {
        try {
          let payload = toRemote(model, row);
          // Strip local-only sync metadata and fields not present remotely
          const {
            // local sync flags
            pendingSync,
            syncStatus,
            lastSyncedAt,
            syncAttempts,
            // generic local-only
            version, // keep if remote supports; re-add per-model if needed
            // model-specific removals
            storeId, // remove for models where remote doesn't have it (e.g., SaleOrder)
            ...cleanPayload
          } = payload || {};
          payload = cleanPayload;
          // Drop any central* reference fields not present in remote schema
          Object.keys(payload).forEach((k) => {
            if (/^central[A-Z]/.test(k)) delete payload[k];
          });
          // Re-introduce allowed fields per model
          if (model === 'InventoryItem') {
            // InventoryItem in remote has version; add back if we had it
            if (typeof version !== 'undefined') payload.version = version;
          }
          // For store-scoped models, use relation connect to satisfy required relation in remote
          const needsStoreConnect = ['Category','Brand','Product','CustomerGroup','Customer','TaxCategory'].includes(model);
          if (needsStoreConnect) {
            const effectiveStoreId = storeId || DEFAULT_IDS.STORE_ID;
            if (!effectiveStoreId) {
              if (SYNC_CONFIG.SYNC_LOG_ENABLED) console.warn(`[push] Skipping ${model} without storeId. Set DEFAULT_STORE_ID to enable push.`);
              continue;
            }
            payload.store = { connect: { id: effectiveStoreId } };
            delete payload.storeId;
          } else if (model !== 'SaleOrder' && model !== 'Shift') {
            // add storeId back for models that support primitive storeId
            if (typeof storeId !== 'undefined') payload.storeId = storeId;
          }
          // Per-model adjustments for remote schema compatibility
          if (model === 'Product' || model === 'Category') {
            if (Array.isArray(payload.imageUrl)) {
              payload.imageUrl = payload.imageUrl.length > 0 ? payload.imageUrl[0] : null;
            }
          }
          if (model === 'Category') {
            if (Object.prototype.hasOwnProperty.call(payload, 'parentId')) {
              if (payload.parentId) {
                payload.parent = { connect: { id: payload.parentId } };
              }
              delete payload.parentId;
            }
          }
          if (model === 'Product') {
            if (payload.categoryId) {
              payload.category = { connect: { id: payload.categoryId } };
              delete payload.categoryId;
            }
            if (payload.brandId) {
              payload.brand = { connect: { id: payload.brandId } };
              delete payload.brandId;
            }
            if (payload.taxCategoryId) {
              payload.taxCategory = { connect: { id: payload.taxCategoryId } };
              delete payload.taxCategoryId;
            }
          }
          if (model === 'ProductVariant') {
            if (payload.productId) {
              payload.product = { connect: { id: payload.productId } };
              delete payload.productId;
            }
          }
          if (model === 'Customer') {
            if (Object.prototype.hasOwnProperty.call(payload, 'groupId')) {
              if (payload.groupId) {
                payload.group = { connect: { id: payload.groupId } };
              }
              delete payload.groupId;
            }
          }
          if (model === 'InventoryItem') {
            if (payload.variantId) {
              payload.variant = { connect: { id: payload.variantId } };
              delete payload.variantId;
            }
            if (payload.locationId) {
              payload.location = { connect: { id: payload.locationId } };
              delete payload.locationId;
            }
          }
          if (model === 'Location') {
            // Remote requires branchId
            if (!payload.branchId) {
              if (DEFAULT_IDS.BRANCH_ID) {
                // Use relation connect to satisfy required relation in remote
                payload.branch = { connect: { id: DEFAULT_IDS.BRANCH_ID } };
              } else {
                if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
                  console.warn('[push] Skipping Location without branchId. Set DEFAULT_BRANCH_ID to enable push.');
                }
                continue;
              }
            }
            // Clean primitive branchId if present to avoid mixed relation inputs
            delete payload.branchId;
          }
          if (model === 'Brand') {
            if (typeof payload.logoUrl === 'undefined') payload.logoUrl = null;
          }
          await remote.upsert({ where: { [pk]: payload[pk] }, create: payload, update: payload });
          // Best-effort mark as synced locally
          try {
            await local.update({ where: { [pk]: row[pk] }, data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED', pendingSync: false } });
          } catch (_) {}
          stats.processed++;
          stats.models[model] = (stats.models[model] || 0) + 1;
        } catch (e) {
          stats.failed++;
          if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
            console.error(`[push] Failed to push ${model} ${row[pk]}:`, e.message);
          }
        }
      }
    } catch (e) {
      if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
        console.error(`[push] Scan failed for ${model}:`, e.message);
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


