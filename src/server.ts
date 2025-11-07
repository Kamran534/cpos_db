import http from 'http';
import { app } from './app.js';
import { initSocket, getIo } from './lib/socket.js';
import { remoteDb } from './lib/db.js';
import { localDb } from './lib/sqlite.js';
import { CentralSyncService } from './modules/sync/core/CentralSyncService.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Test database connections
async function testDatabaseConnections() {
  const results = {
    postgres: { connected: false, error: null as string | null },
    sqlite: { connected: false, error: null as string | null },
  };

  // Test PostgreSQL
  try {
    await remoteDb.$connect();
    await remoteDb.$queryRaw`SELECT 1`;
    results.postgres.connected = true;
    await remoteDb.$disconnect();
  } catch (error: any) {
    results.postgres.error = error.message;
  }

  // Test SQLite
  try {
    await localDb.$connect();
    await localDb.$queryRaw`SELECT 1`;
    results.sqlite.connected = true;
    await localDb.$disconnect();
  } catch (error: any) {
    results.sqlite.error = error.message;
  }

  return results;
}

// Auto-sync function that runs on server restart
async function autoSyncOnStartup() {
  try {
    console.log('[Auto-Sync] Starting auto-sync on server restart...');
    const syncService = new CentralSyncService(remoteDb);
    
    // Get all active terminals
    const terminals = await syncService.getActiveTerminals();
    
    if (terminals.length === 0) {
      console.log('[Auto-Sync] No active terminals found');
      // Debug: Check all terminals to see why none are active
      try {
        const allTerminals = await remoteDb.terminal.findMany({
          select: {
            id: true,
            terminalCode: true,
            terminalName: true,
            isActive: true,
            status: true
          }
        });
        if (allTerminals.length > 0) {
          console.log(`[Auto-Sync] Debug: Found ${allTerminals.length} terminal(s) in database:`);
          allTerminals.forEach((t: any) => {
            console.log(`  - ${t.terminalCode}: isActive=${t.isActive}, status=${t.status}`);
          });
        } else {
          console.log('[Auto-Sync] Debug: No terminals found in database at all');
        }
      } catch (debugError: any) {
        console.error('[Auto-Sync] Debug error:', debugError.message);
      }
      return;
    }

    console.log(`[Auto-Sync] Found ${terminals.length} active terminal(s):`);
    terminals.forEach((t: any) => {
      console.log(`  - ${t.terminalCode} (${t.id}): status=${t.status}`);
    });
    
    // Notify all terminals via socket.io to trigger sync
    const io = getIo();
    if (io) {
      for (const terminal of terminals) {
        try {
          // Emit sync trigger event to terminal
          io.to(`terminal:${terminal.id}`).emit('sync:trigger', {
            type: 'FULL',
            terminalId: terminal.id,
            timestamp: new Date().toISOString(),
            reason: 'SERVER_RESTART'
          });
          
          console.log(`[Auto-Sync] Sync triggered for terminal: ${terminal.terminalCode} (${terminal.id})`);
        } catch (error: any) {
          console.error(`[Auto-Sync] Failed to trigger sync for terminal ${terminal.id}:`, error.message);
        }
      }
    } else {
      console.warn('[Auto-Sync] Socket.io not initialized, skipping socket notifications');
    }

    console.log('[Auto-Sync] Auto-sync completed');
  } catch (error: any) {
    console.error('[Auto-Sync] Error during auto-sync:', error.message);
    console.error('[Auto-Sync] Stack:', error.stack);
  }
}

const server = http.createServer(app);
initSocket(server);

let bannerPrinted = false;

// Handle port errors - only use port 4000
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Please stop the process using port ${PORT} or change the PORT environment variable.\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', error.message);
    process.exit(1);
  }
});

// Start server on port 4000 only
server.listen(PORT, async () => {
  // Prevent duplicate banner printing
  if (bannerPrinted) return;
  bannerPrinted = true;

  const base = `http://localhost:${PORT}`;
  
  // Test database connections
  const dbStatus = await testDatabaseConnections();
  
  const postgresStatus = dbStatus.postgres.connected 
    ? 'Connected' 
    : `Failed${dbStatus.postgres.error ? `: ${dbStatus.postgres.error}` : ''}`;
  
  const sqliteStatus = dbStatus.sqlite.connected 
    ? 'Connected' 
    : `Failed${dbStatus.sqlite.error ? `: ${dbStatus.sqlite.error}` : ''}`;

  const lines = [
    ' CSU Server is running ',
    ` Base URL   : ${base} `,
    ` Swagger    : ${base}/api-docs `,
    '',
    ' Database Connections ',
    ` PostgreSQL : ${postgresStatus} `,
    ` SQLite     : ${sqliteStatus} `,
  ];
  const width = Math.max(...lines.map(l => l.length)) + 2;
  const top = '┌' + '─'.repeat(width) + '┐';
  const bottom = '└' + '─'.repeat(width) + '┘';
  const body = lines.map(l => '│ ' + l.padEnd(width - 1, ' ') + '│').join('\n');
  console.log(`\n${top}\n${body}\n${bottom}\n`);

  // Trigger auto-sync on server startup (after a short delay to ensure everything is ready)
  setTimeout(() => {
    autoSyncOnStartup();
  }, 2000);
});


