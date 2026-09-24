const Database = require('better-sqlite3');
const db = new Database('./crystals.db');

db.exec(`
CREATE TABLE IF NOT EXISTS crystals (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crystal_id TEXT,
  name TEXT,
  value INTEGER,
  unit TEXT
);
`);

// statsテーブルにcondition列がなければ追加
const columns = db.prepare(`
  PRAGMA table_info(stats)
`).all();

if (!columns.some(column => column.name === "condition")) {
  db.prepare(`
    ALTER TABLE stats
    ADD COLUMN condition TEXT DEFAULT ''
  `).run();
}

module.exports = db;

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crystal_id TEXT,
  name TEXT,
  value INTEGER,
  unit TEXT
);
`);

module.exports = db;
