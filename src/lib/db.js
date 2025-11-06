const { PrismaClient } = require('@prisma/client');

const POSTGRES_URL_REMOTE = process.env.POSTGRES_URL_REMOTE || process.env.POSTGRES_URL;

// Local DB is SQLite (handled separately). Do not configure a local PostgreSQL client.
const localDb = null;

const remoteOpts = {};
if (POSTGRES_URL_REMOTE) {
  remoteOpts.datasources = { db: { url: POSTGRES_URL_REMOTE } };
}
const remoteDb = new PrismaClient(remoteOpts);

module.exports = { localDb, remoteDb };


