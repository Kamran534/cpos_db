require('dotenv').config();
const path = require('path');

// Load PrismaClient generated for payflow (SQLite)
// Make sure to run: npm run prisma:generate:payflow before using this client
const { PrismaClient: PayflowPrismaClient } = require('../../node_modules/.prisma/payflow-client');

// Resolve SQLite path - handle both relative and absolute paths
let SQLITE_PATH_LOCAL = process.env.SQLITE_PATH_LOCAL;
if (!SQLITE_PATH_LOCAL) {
  // Default to prisma/payflow.db relative to project root
  const dbPath = path.join(process.cwd(), 'prisma', 'payflow.db');
  // Normalize path separators for Windows (use forward slashes for SQLite)
  SQLITE_PATH_LOCAL = `file:${dbPath.replace(/\\/g, '/')}`;
} else if (!SQLITE_PATH_LOCAL.startsWith('file:')) {
  // If path doesn't start with 'file:', add it
  let resolvedPath = SQLITE_PATH_LOCAL.startsWith('/') || SQLITE_PATH_LOCAL.match(/^[A-Z]:/) 
    ? SQLITE_PATH_LOCAL 
    : path.join(process.cwd(), SQLITE_PATH_LOCAL);
  // Normalize path separators for Windows
  SQLITE_PATH_LOCAL = `file:${resolvedPath.replace(/\\/g, '/')}`;
} else {
  // If it starts with 'file:' but is relative, resolve it
  const filePath = SQLITE_PATH_LOCAL.replace(/^file:/, '');
  if (!path.isAbsolute(filePath)) {
    const resolvedPath = path.join(process.cwd(), filePath);
    // Normalize path separators for Windows
    SQLITE_PATH_LOCAL = `file:${resolvedPath.replace(/\\/g, '/')}`;
  } else {
    // Normalize path separators for Windows
    SQLITE_PATH_LOCAL = `file:${filePath.replace(/\\/g, '/')}`;
  }
}

const localOpts = { datasources: { db: { url: SQLITE_PATH_LOCAL } } };
const localDb = new PayflowPrismaClient(localOpts);

// Log the resolved path for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('[sqlite] Database path:', SQLITE_PATH_LOCAL);
}

// Test connection on initialization
localDb.$connect()
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[sqlite] Successfully connected to SQLite database');
    }
  })
  .catch((err) => {
    console.error('[sqlite] Failed to connect to SQLite database:', err.message);
    console.error('[sqlite] Database path:', SQLITE_PATH_LOCAL);
  });

module.exports = { localDb };
