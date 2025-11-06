# Sync Module – Quick Guide

## What it does
- Keeps data consistent between local terminals (SQLite: payflow.db) and the central PostgreSQL database.
- Supports three modes: manual (REST), scheduled (cron), and on-demand (Socket.IO).

## Key concepts
- Directions:
  - Pull: SQLite → PostgreSQL (send local changes up)
  - Push: PostgreSQL → SQLite (bring central updates down)
- Incremental sync: uses per-table timestamps and persists last checkpoints.
- Mapping: excludes local-only columns (local_id, server_id, sync_status, sync_operation, last_sync_at, terminal_id) and applies renames where needed (e.g., stock_quantity → master_stock_quantity).
- Linkage: `server_id` in SQLite stores the central `id` so the server can upsert the correct record.

## When it runs
- Manual: call the sync API with an authenticated request.
- Cron: the server triggers sync on the schedule from env.
- Socket: the terminal emits an event to trigger immediate sync.

## What it syncs
- Core business tables (stores, terminals, users, categories, products, variants, customers, orders, order_items, payments, inventory_transactions, taxes, discounts, suppliers, purchase orders, receipts, settings, audit logs).
- Missing local tables are skipped gracefully.

## Conflict handling
- Simple last-writer-wins by timestamp (customize if stricter policy is required).
- Soft deletes are noted as a future enhancement.

## One-time bootstrap
- If SQLite rows don’t have `server_id`, run the bootstrap to create central rows and write back `server_id`. This enables safe future pulls.

## Health checks & schema parity
- A script compares table column names in SQLite vs PostgreSQL and reports mismatches.
- Keep schemas aligned or extend mapping rules when fields evolve.

## Your workflow
1) Configure env (paths, batch size, schedule).
2) Bootstrap once to link existing local data.
3) Verify schemas to catch column drift.
4) Choose sync mode: cron for background, manual/socket for immediate.

## Tuning
- Batch size: larger for initial backfill; smaller and frequent for deltas.
- Schedule: off-peak for heavy loads; use socket/manual for on-demand.

## Fail-safes
- Skips tables missing locally.
- Uses checkpoints per table for resumable progress.
- Errors are surfaced via API/socket responses and server logs.

## Before production
- Confirm column mappings and local-only fields for every table.
- Ensure reliable timestamps exist for incremental sync.
- Decide conflict/deletion strategy and extend the engine if needed.
