# Sync Module (SQLite ⇄ PostgreSQL)

## Overview
- Local: SQLite (`SQLITE_PATH_LOCAL`), using `better-sqlite3`
- Remote: PostgreSQL via Prisma
- Direction:
  - push: Postgres → SQLite
  - pull: SQLite → Postgres
- Incremental by timestamp per table (created_at/updated_at/last_updated)
- Checkpoints stored in Postgres `system_settings` as `sync.checkpoint.<direction>.<table>`

## Files
- `src/lib/sqlite.js` – SQLite helper
- `src/modules/sync/config.js` – tables + batch size + mapping
- `src/modules/sync/engine.js` – core pull/push routines with projection + linkage
- `src/modules/sync/service.js` – cron + public API
- `src/modules/sync/validation.js` – zod schemas

## Mapping & Linkage
- Local-only columns excluded when sending to Postgres: `local_id, server_id, sync_status, sync_operation, last_sync_at, terminal_id`
- Renames (SQLite → PG):
  - `products.stock_quantity → products.master_stock_quantity`
  - `product_variants.stock_quantity → product_variants.master_stock_quantity`
- Linkage:
  - From SQLite to PG: uses `server_id` if present to upsert Postgres `id`; rows without `server_id` are skipped for safety
  - From PG to SQLite: sets `server_id = id` (if column exists) and `REPLACE INTO` by existing SQLite primary key

## Endpoints
- POST `/api/sync/trigger?direction=both|push|pull` (JWT)
- POST `/api/sync/configure` (JWT) – re-init cron

## Env
```
SQLITE_PATH_LOCAL=C:\Users\kamra\Desktop\db\payflow.db
SYNC_MODE=cron
SYNC_CRON=0 * * * *
SYNC_BATCH_SIZE=500
```

## Bootstrap (one-time)
Link existing local rows to Postgres IDs:
```
npm run sync:bootstrap
```
Writes server_id in SQLite after creating rows in Postgres (excludes local-only columns; applies renames).

## Checklist (Done)
- Bidirectional table configuration for major entities
- SQLite and Prisma clients wired
- Checkpoints persisted in Postgres
- Zod request validation on trigger
- Error propagation with clear messages
- Mapping and projection to handle schema differences

## TODOs
- Bootstrap step to assign `server_id` for existing local-only rows
- Conflict policy (current: last-writer-wins by timestamp)
- Soft deletes support (where `deleted_at` exists) – propagate delete
- Per-table selective sync and filters (e.g., by store_id/terminal_id)
- Retry/backoff and partial failure recording in `sync_logs`
- Transactions batching for large moves

## Notes
- Ensure both DB schemas match, or expand renames/mappings accordingly.
- Large tables: tune `SYNC_BATCH_SIZE` and schedule.
