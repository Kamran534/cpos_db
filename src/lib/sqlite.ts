import 'dotenv/config';
import path from 'path';
// Load PrismaClient generated for SQLite (cpos.db)
// Make sure to run: npm run prisma:generate:sqlite before using this client
import { PrismaClient } from '../generated/sqlite/index.js';

let SQLITE_PATH_LOCAL = process.env.DATABASE_URL || process.env.SQLITE_PATH_LOCAL;
if (!SQLITE_PATH_LOCAL) {
  const dbPath = path.join(process.cwd(), 'prisma', 'cpos.db');
  SQLITE_PATH_LOCAL = `file:${dbPath.replace(/\\/g, '/')}`;
} else if (!SQLITE_PATH_LOCAL.startsWith('file:')) {
  let resolvedPath = SQLITE_PATH_LOCAL.startsWith('/') || !!SQLITE_PATH_LOCAL.match(/^[A-Z]:/) 
    ? SQLITE_PATH_LOCAL 
    : path.join(process.cwd(), SQLITE_PATH_LOCAL);
  SQLITE_PATH_LOCAL = `file:${resolvedPath.replace(/\\/g, '/')}`;
} else {
  const filePath = SQLITE_PATH_LOCAL.replace(/^file:/, '');
  if (!path.isAbsolute(filePath)) {
    const resolvedPath = path.join(process.cwd(), filePath);
    SQLITE_PATH_LOCAL = `file:${resolvedPath.replace(/\\/g, '/')}`;
  } else {
    SQLITE_PATH_LOCAL = `file:${filePath.replace(/\\/g, '/')}`;
  }
}

const localOpts = { datasources: { db: { url: SQLITE_PATH_LOCAL } } } as const;
export const localDb = new PrismaClient(localOpts);

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log('[sqlite] Database path:', SQLITE_PATH_LOCAL);
}

localDb.$connect()
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[sqlite] Successfully connected to SQLite database');
    }
  })
  .catch((err: any) => {
    // eslint-disable-next-line no-console
    console.error('[sqlite] Failed to connect to SQLite database:', err.message);
    // eslint-disable-next-line no-console
    console.error('[sqlite] Database path:', SQLITE_PATH_LOCAL);
  });


