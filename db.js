
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Railwayでは保存用ボリュームを使用し、
// ローカルでは同じフォルダのデータベースを使用する
const dbPath = fs.existsSync('/app/data')
  ? '/app/data/crystals.db'
  : path.join(__dirname, 'crystals.db');

const db = new Database(dbPath);

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

// condition列が存在しない場合は追加する
const columns = db.prepare('PRAGMA table_info(stats)').all();

if (!columns.some(column => column.name === 'condition')) {
  db.exec("ALTER TABLE stats ADD COLUMN condition TEXT DEFAULT ''");
}

module.exports = db;