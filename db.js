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

module.exports = db;