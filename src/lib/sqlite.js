const Database = require('better-sqlite3');
const path = require('path');

let db;

function getSqlite() {
  if (db) return db;
  const file = process.env.SQLITE_PATH_LOCAL || path.join(process.cwd(), 'payflow.db');
  db = new Database(file, { fileMustExist: true });
  db.pragma('journal_mode = WAL');
  return db;
}

function run(sql, params = {}) {
  return getSqlite().prepare(sql).run(params);
}

function all(sql, params = {}) {
  return getSqlite().prepare(sql).all(params);
}

function get(sql, params = {}) {
  return getSqlite().prepare(sql).get(params);
}

module.exports = { getSqlite, run, all, get };


