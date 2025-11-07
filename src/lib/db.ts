import { PrismaClient } from '@prisma/client';

const POSTGRES_URL_REMOTE = process.env.POSTGRES_URL_REMOTE || process.env.POSTGRES_URL;

// Local DB is SQLite (handled separately). Do not configure a local PostgreSQL client.
export const localDb = undefined;

const remoteOpts: any = {};
if (POSTGRES_URL_REMOTE) {
  remoteOpts.datasources = { db: { url: POSTGRES_URL_REMOTE } };
}
export const remoteDb = new PrismaClient(remoteOpts);


