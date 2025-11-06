require('dotenv').config();
const cron = require('node-cron');
const { runSyncBoth, SYNC_CONFIG } = require('./service');

let task = null;
let isFirstRun = true;

function startHourly() {
  if (task) return task;

  if (!SYNC_CONFIG.SYNC_ENABLED) {
    console.log('[sync-cron] Sync is disabled, not starting cron job');
    return null;
  }

  // Use SYNC_INTERVAL from environment or default to hourly
  const schedule = SYNC_CONFIG.SYNC_INTERVAL;
  const timezone = process.env.SYNC_TIMEZONE || 'UTC';

  console.log(`[sync-cron] Starting sync cron job with schedule: ${schedule} (timezone: ${timezone})`);

  // Run initial full sync on startup (optional, can be disabled with SYNC_INITIAL_FULL=false)
  const runInitialFullSync = process.env.SYNC_INITIAL_FULL !== 'false';
  if (runInitialFullSync) {
    console.log('[sync-cron] Running initial FULL sync on startup...');
    runSyncBoth({ fullSync: true })
      .then((stats) => {
        if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
          console.log('[sync-cron] Initial full sync completed:', {
            push: { processed: stats.push.processed, failed: stats.push.failed },
            pull: { processed: stats.pull.processed, failed: stats.pull.failed },
          });
        }
      })
      .catch((e) => {
        console.error('[sync-cron] Initial full sync failed:', e.message);
      });
  }

  task = cron.schedule(schedule, async () => {
    try {
      // First scheduled run after startup does full sync, subsequent runs are incremental
      const options = isFirstRun && !runInitialFullSync ? { fullSync: true } : {};
      isFirstRun = false;

      const stats = await runSyncBoth(options);
      if (SYNC_CONFIG.SYNC_LOG_ENABLED) {
        console.log('[sync-cron] Scheduled sync completed:', {
          push: { processed: stats.push.processed, failed: stats.push.failed },
          pull: { processed: stats.pull.processed, failed: stats.pull.failed },
        });
      }
    } catch (e) {
      console.error('[sync-cron] Scheduled sync failed:', e.message);
    }
  }, { timezone });
  task.start();
  return task;
}

async function triggerNow() {
  try {
    const stats = await runSyncBoth();
    console.log('[sync-trigger] Manual sync completed:', {
      push: { processed: stats.push.processed, failed: stats.push.failed },
      pull: { processed: stats.pull.processed, failed: stats.pull.failed },
    });
    return stats;
  } catch (e) {
    console.error('[sync-trigger] Manual sync failed:', e.message);
    throw e;
  }
}

module.exports = { startHourly, triggerNow };


