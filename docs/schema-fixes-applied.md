# Schema Fixes Applied - Summary

## What Was Fixed

### 1. SQLite Schema Alignment (✅ COMPLETED)

The SQLite database schema has been successfully aligned with the PostgreSQL schema. The following changes were applied:

#### Added Missing Columns:
- **stores**: `created_by`
- **terminals**: `last_known_ip`, `created_by`
- **users**: `store_id`, `created_by` (terminal_id made nullable)
- **categories**: `store_id`, `created_by`
- **products**: `store_id`, `supplier_id`, `created_by`, `master_stock_quantity`
- **product_variants**: `master_stock_quantity`
- **customers**: `store_id`, `created_by`
- **orders**: `source_terminal_id`, `sync_batch_id`
- **inventory_transactions**: `store_id`, `source_terminal_id`, `sync_batch_id`
- **taxes**: `store_id`, `created_by`
- **discounts**: `store_id`, `created_by`
- **suppliers**: `store_id`, `created_by`
- **purchase_orders**: `store_id`, `created_by`
- **receipts**: `source_terminal_id`

#### Created Missing Tables:
- **system_settings** - For storing configuration and sync checkpoints
- **audit_logs** - For tracking user actions
- **terminal_stock_levels** - For per-terminal stock tracking

### 2. Schema Verification Results

After applying the migration, the only remaining differences are **expected and by design**:

- `local_id` (SQLite) vs `id` (PostgreSQL) - Primary key naming difference
- `server_id`, `sync_status`, `sync_operation`, `last_sync_at` - SQLite-specific sync metadata
- `terminal_id` - SQLite-specific column for local terminal context
- `stock_quantity` vs `master_stock_quantity` - Column name mapping (handled by config)

All PostgreSQL columns are now present in SQLite (as original names or mapped equivalents).

---

## What Needs Manual Improvement

### Sync Engine Enhancements Required

The sync engine at `src/modules/sync/engine.js` needs the following improvements to handle the schema changes:

#### 1. **Better Foreign Key Error Handling**

**Current Issue**: When a foreign key lookup fails, records are silently skipped without detailed logging.

**Required Change** in `pushTable()` function around line 144-161:

```javascript
// BEFORE:
for (const m of mappings) {
  if (data[m.field] && sqliteCols.includes(m.field)) {
    try {
      const refCols = getSqliteColumns(m.refTable);
      if (refCols.includes('server_id') && (refCols.includes('local_id') || refCols.includes('id'))) {
        const pkCol = refCols.includes('local_id') ? 'local_id' : 'id';
        const ref = getSqlite().prepare(`SELECT ${pkCol} as pk FROM ${m.refTable} WHERE server_id = ? LIMIT 1`).get(data[m.field]);
        if (ref && ref.pk !== undefined) {
          data[m.field] = ref.pk;
        } else {
          fkMissing = true;
        }
      }
    } catch (_) {
      fkMissing = true;
    }
  }
}
if (fkMissing) continue; // skip row until dependencies are present

// AFTER (with better error handling):
let missingFkDetails = [];

for (const m of mappings) {
  if (data[m.field] && sqliteCols.includes(m.field)) {
    try {
      const refCols = getSqliteColumns(m.refTable);
      if (refCols.includes('server_id') && (refCols.includes('local_id') || refCols.includes('id'))) {
        const pkCol = refCols.includes('local_id') ? 'local_id' : 'id';
        const ref = getSqlite().prepare(`SELECT ${pkCol} as pk FROM ${m.refTable} WHERE server_id = ? LIMIT 1`).get(data[m.field]);
        if (ref && ref.pk !== undefined && ref.pk !== null) {
          data[m.field] = ref.pk;
        } else {
          fkMissing = true;
          missingFkDetails.push(`${m.field}->${m.refTable}[${data[m.field]}]`);
        }
      }
    } catch (err) {
      fkMissing = true;
      missingFkDetails.push(`${m.field}->${m.refTable}[error:${err.message}]`);
    }
  }
}

if (fkMissing) {
  console.warn(`[SYNC] Skipped ${name}:${row[pk]} - missing FK dependencies: ${missingFkDetails.join(', ')}`);
  continue; // skip row until dependencies are present
}
```

#### 2. **Auto-populate terminal_id for Local Records**

**Current Issue**: Tables that have `terminal_id` in SQLite (but not in PostgreSQL) will fail with NOT NULL constraint if terminal_id is required.

**Required Addition** after FK mapping (around line 162):

```javascript
// Auto-populate terminal_id if column exists and is NOT already set
// Use the first terminal from SQLite database as default
if (sqliteCols.includes('terminal_id') && !data.terminal_id) {
  try {
    const terminal = getSqlite().prepare('SELECT local_id FROM terminals LIMIT 1').get();
    if (terminal && terminal.local_id) {
      data.terminal_id = terminal.local_id;
    }
  } catch (_) {
    // Ignore if terminals table is empty or doesn't exist
  }
}
```

#### 3. **Track Sync Statistics**

**Current Issue**: No visibility into how many records were synced vs skipped.

**Required Change** in `pushTable()` function:

```javascript
// At the start of the function (after line 136):
let synced = 0;
let skipped = 0;

// When successfully inserting (around line 171):
try {
  getSqlite().prepare(sql).run(values);
  synced++;  // <-- Add this
} catch (e) {
  throw new Error(`Push upsert failed for ${name}:${row[pk]} - ${e.message}`);
}

// When skipping due to FK missing (after line 162):
if (fkMissing) {
  skipped++;  // <-- Add this
  console.warn(`[SYNC] Skipped ${name}:${row[pk]} - missing FK dependencies: ${missingFkDetails.join(', ')}`);
  continue;
}

// At the end of the function (line 178):
return { count: synced, skipped };  // <-- Change from { count: rows.length }
```

---

## Testing the Sync

After making the above improvements to the sync engine, test the sync with:

```bash
# Test push sync (PostgreSQL → SQLite)
curl -X POST http://localhost:4000/api/sync/trigger?direction=push

# Test pull sync (SQLite → PostgreSQL)
curl -X POST http://localhost:4000/api/sync/trigger?direction=pull

# Test bidirectional sync
curl -X POST http://localhost:4000/api/sync/trigger?direction=both

# Check sync logs
curl http://localhost:4000/api/sync/logs

# Check sync stats
curl http://localhost:4000/api/sync/stats
```

---

## Important Notes

### 1. Table Sync Order Matters

The current sync configuration processes tables in the order they appear in `src/modules/sync/config.js`. Tables with foreign key dependencies should be synced **after** their parent tables:

**Current Order**:
```javascript
const tables = [
  { name: 'stores', ... },        // 1. Sync first (no dependencies)
  { name: 'terminals', ... },     // 2. Depends on stores
  { name: 'users', ... },         // 3. Depends on stores (optional: terminals)
  { name: 'categories', ... },    // 4. Depends on stores
  { name: 'products', ... },      // 5. Depends on categories, stores, suppliers
  // ... and so on
];
```

This order is correct and should not be changed.

### 2. Initial Sync / Bootstrap

If you're syncing for the first time or need to reset:

1. **Clear sync checkpoints** (resets to sync all data):
```sql
-- In PostgreSQL
DELETE FROM system_settings WHERE setting_key LIKE 'sync.checkpoint.%';
```

2. **Run bootstrap script** (for existing SQLite data):
```bash
node scripts/bootstrap-sync.js
```

This will create PostgreSQL records for all existing SQLite rows and populate their `server_id` fields.

### 3. Monitoring Sync Operations

Watch the server logs when running sync:
```bash
npm run dev
```

You should see:
- `[SYNC] Skipped ...` warnings for records with missing dependencies
- Detailed FK dependency information for troubleshooting

---

## Files Modified

1. ✅ `payflow.db` - SQLite database schema updated
2. ✅ `scripts/fix-sqlite-schema.sql` - Migration script created
3. ⚠️ `src/modules/sync/engine.js` - **NEEDS MANUAL UPDATES** (see above)
4. ✅ `payflow.db.backup` - Backup created before migration

---

## Next Steps

1. **Apply the sync engine improvements** listed above
2. **Restart the server** to load the updated code
3. **Test sync operations** with curl commands
4. **Monitor logs** for any remaining errors
5. **Check sync stats** to ensure data is flowing correctly

---

## Troubleshooting

### Error: "NOT NULL constraint failed: [table].[column]"

**Cause**: A required column is receiving NULL value during sync.

**Solution**:
- Check if the column has a corresponding value in PostgreSQL
- Verify FK mappings are working (check `fkMap` in `config.js`)
- Ensure parent records exist before syncing child records

### Error: "Skipped [table]:[id] - missing FK dependencies"

**Cause**: Parent record hasn't been synced yet.

**Solution**:
- Sync parent tables first (e.g., stores before terminals)
- Check if parent record exists in SQLite: `SELECT * FROM [parent_table] WHERE server_id = '[id]'`
- If missing, manually sync the parent table first

### Sync Returns { count: 0 }

**Cause**: No new records to sync (checkpoint is up to date).

**Solution**:
- This is normal if databases are already in sync
- To force re-sync, delete checkpoints (see "Initial Sync" above)
- Check PostgreSQL for new/updated records since last sync

---

## Summary

✅ **Schema alignment complete** - All required columns added to SQLite
✅ **Missing tables created** - system_settings, audit_logs, terminal_stock_levels
⚠️ **Sync engine needs updates** - Manual improvements required (see above)
✅ **Backup created** - payflow.db.backup saved
✅ **Migration script saved** - scripts/fix-sqlite-schema.sql for reference

The databases are now structurally aligned and ready for sync operations once the engine improvements are applied.
