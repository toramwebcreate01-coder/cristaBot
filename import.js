const Database = require("better-sqlite3");
const db = new Database("crystals.db");

const fs = require("fs");
const csv = require("csv-parser");

// 初期化
db.prepare("DELETE FROM evolutions").run();
db.prepare("DELETE FROM stats").run();
db.prepare("DELETE FROM crystals").run();

const crystalMap = new Map();
const evoList = [];

// 🔥 BOM除去 + キー正規化
const normalizeRow = (row) => {
  const newRow = {};
  for (const key in row) {
    const cleanKey = key.replace(/^\uFEFF/, "").trim();
    newRow[cleanKey] = typeof row[key] === "string"
      ? row[key].replace(/^\uFEFF/, "").trim()
      : row[key];
  }
  return newRow;
};

fs.createReadStream("data.csv")
  .pipe(csv())
  .on("data", (row) => {

    row = normalizeRow(row);

    // 🔥 空行完全除外
    if (!row.name || row.name.trim() === "") {
      console.log("⚠️ name空行スキップ:", row);
      return;
    }

    // crystals
    const result = db.prepare(`
      INSERT INTO crystals (name, type)
      VALUES (?, ?)
    `).run(row.name, row.type);

    const id = result.lastInsertRowid;
    crystalMap.set(row.name, id);

    // stats
    if (row.stats) {
      for (const pair of row.stats.split(",")) {

        let [k, v] = pair.split("=");
        if (!k || !v) continue;

        k = k.trim();
        v = v.trim();

        let unit = "";
        let value = 0;

        if (v.includes("%")) {
          unit = "%";
          value = Number(v.replace("%", ""));
        } else {
          value = Number(v);
        }

        if (isNaN(value)) continue;

        db.prepare(`
          INSERT INTO stats (crystal_id, name, value, unit)
          VALUES (?, ?, ?, ?)
        `).run(id, k, value, unit);
      }
    }

    // evolution
    if (row.evolution && row.evolution.trim() !== "") {

  // | 区切り対応
  const evolutions = row.evolution.split("|");

  for (const evo of evolutions) {

    const evoName = evo.trim();

    if (!evoName) continue;

    evoList.push({
      from: row.name.trim(),
      to: evoName
    });
  }
}
  })

  .on("end", () => {

    for (const evo of evoList) {

      const fromId = crystalMap.get(evo.from);
      const toId = crystalMap.get(evo.to);

      if (!fromId || !toId) {
        console.log("⚠️ evolutionスキップ:", evo);
        continue;
      }

      db.prepare(`
        INSERT INTO evolutions (from_id, to_id)
        VALUES (?, ?)
      `).run(fromId, toId);
    }

    console.log("✅ インポート完了");
  });