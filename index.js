const TYPE_MAP = {
  normal: "normal",
  weapon: "weapon",
  armor: "armor",
  option: "option",
  accessories: "accessories",

  通常: "normal",
  武器: "weapon",
  防具: "armor",
  追加: "option",
  特殊: "accessories"
};

const TYPE_LABEL = {
  normal: "通常",
  weapon: "武器",
  armor: "防具",
  option: "追加",
  accessories: "特殊"
};

const TYPE_COLOR = {
  normal: 0x3498DB,      // 青
  weapon: 0xE74C3C,      // 赤
  armor: 0x2ECC71,       // 緑
  option: 0xF1C40F,      // 黄
  accessories: 0x9B59B6  // 紫
};

const TYPE_ICON = {
  normal: "🔵",
  weapon: "🔴",
  armor: "🟢",
  option: "🟡",
  accessories: "🟣"
};

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const db = require('./db');

try {
  const rows = db.prepare("SELECT COUNT(*) as count FROM crystals").get();
  console.log("データ件数:", rows.count);
} catch (err) {
  console.error("DBエラー:", err.message);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const ADMIN_IDS = ["950374768962601001"];

function isAdmin(interaction) {
  return ADMIN_IDS.includes(interaction.user.id);
}

function normalize(text) {
  if (!text) return ""; 
  return text
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    .replace(/[\u30A1-\u30F6]/g, s =>
      String.fromCharCode(s.charCodeAt(0) - 0x60)
    )
    .replace(/[+％%]/g, "")
    .trim();
}

const ADMIN_CHANNEL_ID = "1495313770665218058";

const SEARCH_CHANNEL_ID = "1495313250735231056";

// =======================
// DB
// =======================

function getAllCrystals() {
  return db.prepare(`SELECT * FROM crystals`).all();
}

function getCrystalById(id) {
  return db.prepare(`SELECT * FROM crystals WHERE id = ?`).get(id);
}

function getCrystalByName(name) {
  return db.prepare(`SELECT * FROM crystals WHERE name = ?`).get(name);
}

function getStatsById(id) {
  return db.prepare(`
    SELECT name, value, unit
    FROM stats
    WHERE crystal_id = ?
  `).all(id);
}

function getCrystalWithStats(id) {
  const c = getCrystalById(id);
  if (!c) return null;
  return { ...c, stats: getStatsById(id) };
}

    function findRoot(id, edges) {

  let current = String(id);

  while (true) {

    console.log("find current =", current);

    const parent = edges.find(
      e => String(e.to_id) === current
    );

    console.log("parent =", parent);

    if (!parent) break;

    current = String(parent.from_id);
  }

  return current;
}
   
function getEvolutionTreeGraph(startId) {

  console.log("tree start =", startId);

  startId = Number(startId);

  const edges = db.prepare(`
    SELECT from_id, to_id
    FROM evolutions
  `).all();

  const crystals = getAllCrystals().map(c => ({
    ...c,
    stats: getStatsById(c.id)
  }));

  const map = new Map();
crystals.forEach(c => map.set(String(c.id), c));

  const lines = [];

  // ======================
  // root探索
  // ======================

  function findRoot(id) {

    let current = Number(id);

    while (true) {

      const parent = edges.find(
        e => Number(e.to_id) === current
      );

      if (!parent) break;

      current = Number(parent.from_id);
    }

    return current;
  }

  const rootId = findRoot(startId);

  // ======================
  // tree描画
  // ======================

  function walk(id, prefix = "", isLast = true) {

  id = String(id);

  const c = map.get(id);

  if (!c) return;
    
    const stats = (c.stats || [])
      .map(s => {
        const sign = s.value >= 0 ? "+" : "";

return `${s.name} ${sign}${s.value}${s.unit}`;
      })
      .join("\n");

    const branch =
      prefix === ""
        ? ""
        : (isLast ? "└ " : "├ ");

   lines.push(
  `${prefix}${branch}${TYPE_ICON[c.type] || "🔹"} ${c.name}`
);
    if (stats) {

  const statPrefix =
    prefix + (isLast ? "　" : "│ ");

  stats.split("\n").forEach(line => {
    lines.push(`${statPrefix}│ ${line}`);
  });
}

    const children = edges.filter(
  e => String(e.from_id) === id
);

    children.forEach((child, index) => {

      const last =
        index === children.length - 1;

      const newPrefix =
        prefix + (isLast ? "  " : "│ ");

      walk(child.to_id, newPrefix, last);
    });
  }

  walk(rootId);

  return lines.join("\n");
}

// =======================
// 起動
// =======================

client.on("clientReady", () => {
  console.log('Bot起動!');
});

// =======================
// イベント
// =======================

client.on(Events.InteractionCreate, async interaction => {

  try {

    // ======================
    // 🔍 オートコンプリート
    // ======================
    if (interaction.isAutocomplete()) {

  const focused = interaction.options.getFocused();

  const words = focused.split(" ");
  const currentWord = words[words.length - 1];

  const allStats = db.prepare(`
    SELECT DISTINCT name FROM stats
  `).all().map(s => s.name);

  const all = [
    ...allStats.map(name => ({ name, type: "stat" })),
    ...Object.entries(TYPE_LABEL).map(([key, label]) => ({
      name: label,
      type: "type",
      key: key
    }))
  ];

  const filtered = all
    .filter(item =>
      normalize(item.name).includes(normalize(currentWord))
    )
    .slice(0, 25);

  return interaction.respond(
    filtered.map(item => {

      // ⭐ typeなら内部キー使う
      const word = item.type === "type" ? item.name : item.name;

      const newWords = [...words.slice(0, -1), word];

      const label =
        item.type === "type"
          ? `${item.name}（タイプ）`
          : `${item.name}（ステータス）`;

      const value = newWords.join(" ").slice(0, 100);

      return {
        name: `${newWords.join(" ")} ｜ ${label}`,
        value: value
      };
    })
  );
}

    // ======================
    // 🧾 モーダル送信
    // ======================
    if (interaction.isModalSubmit()) {

      // クリスタ追加
      if (interaction.customId === "modal_add_crystal") {

        const name = interaction.fields.getTextInputValue("name");
        const rawType = interaction.fields.getTextInputValue("type").toLowerCase();
const type = TYPE_MAP[rawType];

if (!type) {
  return interaction.reply({
    content: "❌ タイプ不正\nnormal / weapon / armor / option / accessories\nまたは 日本語（通常・武器・防具・追加・特殊）",
    flags: 64
});
}
        const statsRaw = interaction.fields.getTextInputValue("stats");

        const result = db.prepare(`
  INSERT INTO crystals (name, type)
  VALUES (?, ?)
`).run(name, type);

const crystalId = result.lastInsertRowid;

for (const pair of statsRaw.split(/[ ,]+/)) {

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
  `).run(crystalId, k, value, unit);
}

// ← for文を閉じる

return interaction.reply({
  content: `✅ ${name} を追加しました`,
  flags: 64
});
      }

      // 進化追加
      if (interaction.customId === "modal_add_evo") {

  const from = interaction.fields.getTextInputValue("from");
  const to = interaction.fields.getTextInputValue("to");

  const fromCrystal = getAllCrystals().find(c =>
  c.name.includes(from)
);

const toCrystal = getAllCrystals().find(c =>
  c.name.includes(to)
);

const fromId = fromCrystal?.id;
const toId = toCrystal?.id;

  if (!fromId || !toId) {
    return interaction.reply({
      content: "❌ クリスタが見つかりません",
      flags: 64
    });
  }

  db.prepare(`
    INSERT INTO evolutions (from_id, to_id)
    VALUES (?, ?)
  `).run(fromId, toId);

  return interaction.reply({
    content: `✅ ${from} → ${to} を追加しました`,
    flags: 64
  });
}
//クリスタ編集
if (interaction.customId.startsWith("modal_edit_")) {

  const id = interaction.customId.replace("modal_edit_", "");

  const name = interaction.fields.getTextInputValue("name");
  const rawType = interaction.fields.getTextInputValue("type").toLowerCase();
const type = TYPE_MAP[rawType];

if (!type) {
  return interaction.reply({
    content: "❌ タイプ不正",
     flags: 64
});
} 
  const statsRaw = interaction.fields.getTextInputValue("stats");

  // 名前更新
  db.prepare(`
    UPDATE crystals SET name = ?, type = ?
WHERE id = ?
  `).run(name, type, id);

  // 一旦全部削除
  db.prepare(`
    DELETE FROM stats WHERE crystal_id = ?
  `).run(id);

  // 再登録
 for (const pair of statsRaw.split(/[ ,]+/)) {

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
  `).run(crystalId, k, value, unit);
}

return interaction.reply({
  content: `✅ ${name} を追加しました`,
  flags: 64
});
}
    }

    // ======================
    // 🔘 ボタン
    // ======================
    if (interaction.isButton()) {

      // クリスタ追加UI
      if (interaction.customId === "admin_add_crystal") {

        if (interaction.channelId !== ADMIN_CHANNEL_ID) {
  return interaction.reply({
    content: "管理チャンネルで使用してください",
     flags: 64
});
}

        const modal = new ModalBuilder()
          .setCustomId("modal_add_crystal")
          .setTitle("クリスタ追加");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("name")
              .setLabel("名前")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("type")
              .setLabel("タイプ")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("stats")
              .setLabel("atk=5,str=3")
              .setStyle(TextInputStyle.Paragraph)
          )
        );

        return interaction.showModal(modal);
      }

      // 進化追加UI
      if (interaction.customId === "admin_add_evo") {

        const modal = new ModalBuilder()
          .setCustomId("modal_add_evo")
          .setTitle("進化追加");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("from")
              .setLabel("進化前")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("to")
              .setLabel("進化後")
              .setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

if (interaction.customId === "admin_list") {

  const crystals = getAllCrystals();

  if (!crystals.length) {
    return interaction.reply({
      content: "データなし",
       flags: 64
});
  }

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("admin_select_crystal")
      .setPlaceholder("削除するクリスタを選択")
      .addOptions(
        crystals.slice(0, 25).map(c => ({
          label: c.name,
          value: String(c.id)
        }))
      )
  );

  return interaction.reply({
    content: "📦 クリスタ一覧",
    components: [select],
    flags: 64
});
}

if (interaction.customId.startsWith("admin_delete_")) {

  const id = interaction.customId.replace("admin_delete_", "");

 // 念のため存在確認
  const crystal = getCrystalById(id);
  if (!crystal) {
    return interaction.reply({
      content: "❌ すでに削除されています",
       flags: 64
});
  }

  // stats削除
  db.prepare(`
    DELETE FROM stats WHERE crystal_id = ?
  `).run(id);

  // evolution削除（両方向）
  db.prepare(`
    DELETE FROM evolutions WHERE from_id = ? OR to_id = ?
  `).run(id, id);

  // 本体削除
  db.prepare(`
    DELETE FROM crystals WHERE id = ?
  `).run(id);

  return interaction.reply({
    content: "🗑 削除しました",
     flags: 64
});
}

      // 進化表示
      if (interaction.customId.startsWith("evo_")) {

  console.log("evo button =", interaction.customId);

  await interaction.deferReply({
    flags: 64
  });

  const id = interaction.customId.replace("evo_", "");

  console.log("evo id =", id);

  const text = getEvolutionTreeGraph(id);

  return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🌿 進化ツリー")
              .setDescription(text || "進化データがありません")
          ]
        });
      }
//クリスタ編集
if (interaction.customId.startsWith("admin_edit_")) {

  const id = interaction.customId.replace("admin_edit_", "");
  const crystal = getCrystalWithStats(id);

  if (!crystal) {
    return interaction.reply({
      content: "データなし",
       flags: 64
});
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_edit_${id}`)
    .setTitle("クリスタ編集");

  const name = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("名前")
    .setStyle(TextInputStyle.Short)
    .setValue(crystal.name);

const type = new TextInputBuilder() 
  .setCustomId("type")
  .setLabel("タイプ (normal / weapon / armor / option / accessories)")
  .setStyle(TextInputStyle.Short)
  .setValue(crystal.type);

  const stats = new TextInputBuilder()
    .setCustomId("stats")
    .setLabel("atk=5,str=3")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(
      (crystal.stats || [])
        .map(s => `${s.name}=${s.value}${s.unit}`)
        .join(",")
    );

  modal.addComponents(
  new ActionRowBuilder().addComponents(name),
  new ActionRowBuilder().addComponents(type),
  new ActionRowBuilder().addComponents(stats)
);

  return interaction.showModal(modal);
}

    }


 if (interaction.isStringSelectMenu()) {

  if (interaction.customId === "admin_select_crystal") {

    const id = interaction.values[0];
    const crystal = getCrystalWithStats(id);

    if (!crystal) {
      return interaction.reply({
        content: "データなし",
         flags: 64
});
    }

    const statsText = (crystal.stats || [])
      .map(s => {
        const sign = s.value >= 0 ? "+" : "";

return `${s.name} ${sign}${s.value}${s.unit}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`🧩 ${crystal.name}`)
      .setDescription(statsText || "ステータスなし")
      .setColor(TYPE_COLOR[crystal.type] || 0x95A5A6)
      .addFields({
        name: "タイプ",
        value: TYPE_LABEL[crystal.type] || crystal.type,
        inline: true
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_edit_${crystal.id}`)
        .setLabel("✏️ 編集")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`admin_delete_${crystal.id}`)
        .setLabel("🗑 削除")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64
    });
  }
}

    // ======================
    // ⛔ コマンド以外除外
    // ======================
    if (!interaction.isChatInputCommand()) return;

    // ======================
    // 🔍 search
    // ======================
   if (interaction.commandName === "search") {

  console.log("現在:", interaction.channelId);
  console.log("設定:", SEARCH_CHANNEL_ID);

  if (String(interaction.channelId) !== String(SEARCH_CHANNEL_ID)) {

    console.log("チャンネル不一致");

    return interaction.reply({
      content: "検索チャンネルで使用してください",
      flags: 64
});
  }

  console.log("チャンネル一致");

  await interaction.deferReply({
  flags: 64
});

const raw = interaction.options.getString("query").toLowerCase();

const searchWords = raw.split(" ");

let typeFilter = null;

let keywords = [];

let signFilter = null;
let percentFilter = false;

let sortMode = null;

let minValue = null;
let maxValue = null;
let exactValue = null;

// ======================
// 固定値が存在するステータス一覧
// ======================

const flatStatNames = new Set();

getAllCrystals().forEach(c => {

  const stats = getStatsById(c.id);

  stats.forEach(s => {

    if (s.unit !== "%") {
      flatStatNames.add(
        normalize(s.name)
      );
    }
  });
});
     
// ======================
// 検索ワード解析
// ======================

for (const w of searchWords) {

  // タイプ
  if (TYPE_MAP[w]) {
    typeFilter = TYPE_MAP[w];
    continue;
  }

  // ソート
  if (w === "asc" || w === "worst") {
    sortMode = "asc";
    continue;
  }

  if (w === "desc" || w === "top") {
    sortMode = "desc";
    continue;
  }

  // %
  if (w.includes("%")) {
    percentFilter = true;
  }

  // +
  if (w.includes("+")) {
    signFilter = "plus";
  }

  // -
  if (w.includes("-")) {
    signFilter = "minus";
  }

  // >=
  const gte = w.match(/^(.+?)>=(-?\d+)$/);

  if (gte) {
    keywords.push(normalize(gte[1]));
    minValue = Number(gte[2]);
    continue;
  }

  // <=
  const lte = w.match(/^(.+?)<=(-?\d+)$/);

  if (lte) {
    keywords.push(normalize(lte[1]));
    maxValue = Number(lte[2]);
    continue;
  }

  // =
  const exact = w.match(/^(.+?)=(-?\d+)$/);

  if (exact) {
    keywords.push(normalize(exact[1]));
    exactValue = Number(exact[2]);
    continue;
  }

  // 範囲 atk5-10
  const range = w.match(/^(.+?)(-?\d+)-(-?\d+)$/);

  if (range) {
    keywords.push(normalize(range[1]));
    minValue = Number(range[2]);
    maxValue = Number(range[3]);
    continue;
  }

  keywords.push(normalize(w));
}

// ======================
// 検索
// ======================

const results = getAllCrystals()
  .map(c => ({
    ...c,
    stats: getStatsById(c.id)
  }))
  .filter(c => {

    // タイプ
    if (
      typeFilter &&
      c.type !== typeFilter
    ) {
      return false;
    }

    return keywords.every(keyword => {

      // 名前検索
     const hasSymbolSearch =
  keyword.includes("+") ||
  keyword.includes("-") ||
  keyword.includes("%");

const crystalMatch =
  hasSymbolSearch
    ? false
    : normalize(c.name)
        .includes(
          normalize(keyword)
        );

      // ステータス検索
      const statMatch = (c.stats || []).some(s => {

  const statName =
    normalize(s.name);

  const cleanKeyword =
    normalize(
      keyword.replace(/[+%\-]/g, "")
    );

  // 名前一致
  if (statName !== cleanKeyword) {
    return false;
  }

  // 記号判定
  const isPlus =
  keyword.includes("+") &&
  !keyword.includes("%");

const isMinus =
  keyword.includes("-") &&
  !keyword.includes("%");

　const isPlusPercent =
  keyword.includes("+%");

const isMinusPercent =
  keyword.includes("-%");

  const isPercent =
    keyword.includes("%");

  // +検索
  if (isPlus && s.value <= 0) {
    return false;
  }

  // -検索
  if (isMinus && s.value >= 0) {
    return false;
  }

  // %検索
  if (isPercent) {

  // %のみ
  if (s.unit !== "%") {
    return false;
  }

  // +%
  if (
    isPlusPercent &&
    s.value <= 0
  ) {
    return false;
  }

  // -%
  if (
    isMinusPercent &&
    s.value >= 0
  ) {
    return false;
  }

}
  else {

    // 固定値優先判定
    const hasFlatStat =
      flatStatNames.has(cleanKeyword);

    // 固定値存在時は%を除外
    if (
      hasFlatStat &&
      s.unit === "%"
    ) {
      return false;
    }
  }

  // 数値条件
  if (
    minValue !== null &&
    s.value < minValue
  ) {
    return false;
  }

  if (
    maxValue !== null &&
    s.value > maxValue
  ) {
    return false;
  }

  if (
    exactValue !== null &&
    s.value !== exactValue
  ) {
    return false;
  }

  return true;
});

      return (
        crystalMatch ||
        statMatch
      );
    });
  });

// ======================
// ソート
// ======================

if (sortMode && keywords.length > 0) {

  const targetKeyword = keywords[0];

  results.sort((a, b) => {

    const aStat = (a.stats || []).find(
      s => normalize(s.name) === targetKeyword
    );

    const bStat = (b.stats || []).find(
      s => normalize(s.name) === targetKeyword
    );

    const aValue = aStat ? aStat.value : 0;
    const bValue = bStat ? bStat.value : 0;

    return sortMode === "desc"
      ? bValue - aValue
      : aValue - bValue;
  });
}

// ======================
// 結果なし
// ======================

if (!results.length) {
  return interaction.editReply("見つかりませんでした");
}

      let page = 0;
      const perPage = 10;

      const createUI = () => {

  const current = results.slice(page * perPage, page * perPage + perPage);

  // ⭐ 検索結果Embed（一覧）
  const embeds = [
    new EmbedBuilder()
      .setTitle(`🔍 検索結果 ${typeFilter ? `(${TYPE_LABEL[typeFilter]})` : ""}`)
      .setDescription(
  current.map((c, i) => {

    const icon = TYPE_ICON[c.type] || "🔹";
    const label = TYPE_LABEL[c.type] || c.type;

    // ⭐ 上位2つだけ表示（見やすさ重視）
    const preview = (c.stats || [])
      .slice(0, 2)
      .map(s => {
        const sign = s.value >= 0 ? "+" : "";
        return `${s.name}${sign}${s.value}${s.unit}`;
      })
      .join(" / ");

    return `${i + 1}. ${icon} ${c.name}（${label}）\n   ${preview}`;
  }).join("\n")
)
      .setColor(0x00AEFF)
  ];

  // ⭐ ページ送りボタン
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled((page + 1) * perPage >= results.length)
  );

  // ⭐ セレクト
  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select")
      .setPlaceholder("クリスタ選択")
      .addOptions(current.map(c => ({
       label: c.name,
        value: String(c.id)
      })))
  );

  return {
    embeds,
    components: [buttons, select]
  };
};

      const msg = await interaction.editReply(createUI());

      const collector = msg.createMessageComponentCollector({
  time: 60000,
  filter: i =>
    i.user.id === interaction.user.id &&
    ["prev", "next", "select"].includes(i.customId)
});

 collector.on("collect", async i => {

  // ▶ 次ページ
  if (i.customId === "next") {
    page++;
    return i.update(createUI());
  }

  // ◀ 前ページ
  if (i.customId === "prev") {
    page--;
    return i.update(createUI());
  }

  // セレクト
  if (i.customId === "select") {

    await i.deferReply({ flags: 64 });

    const target = getCrystalWithStats(i.values[0]);

    const statsText = (target.stats || [])
      .map(s => {
        const sign = s.value >= 0 ? "+" : "";

return `${s.name} ${sign}${s.value}${s.unit}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`${TYPE_ICON[target.type] || "🔹"} ${target.name}`)
      .setDescription(statsText || "ステータスなし")
      .setColor(TYPE_COLOR[target.type] || 0x95A5A6)
      .addFields({
        name: "タイプ",
        value: TYPE_LABEL[target.type] || target.type,
        inline: true
      });

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`evo_${target.id}`)
        .setLabel("進化を見る")
        .setStyle(ButtonStyle.Secondary)
    );

    return i.editReply({
      embeds: [embed],
      components: [btn]
    });
  }
});

      return;
    }

    // ======================
    // 🌱 evolution
    // ======================
    if (interaction.commandName === "evolution") {

     await interaction.deferReply({
  flags: 64
});

      const name = interaction.options.getString("name");
      const target = getAllCrystals().find(c => c.name.includes(name));

      if (!target) {
        return interaction.editReply("見つかりません");
      }

      const text = getEvolutionTreeGraph(target.id);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🌿 進化ツリー")
            .setDescription(text)
            .setColor(TYPE_COLOR[target.type] || 0x95A5A6)
        ]
      });
    }

    // ======================
    // 🛠 admin
    // ======================
    if (interaction.commandName === "admin") {

      if (!isAdmin(interaction)) {
        return interaction.reply({ 
          content: "権限なし", 
           flags: 64
});
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
    .setCustomId("admin_add_crystal")
    .setLabel("🆕 クリスタ追加")
    .setStyle(ButtonStyle.Primary),

  new ButtonBuilder()
    .setCustomId("admin_add_evo")
    .setLabel("🔗 進化追加")
    .setStyle(ButtonStyle.Secondary),

  new ButtonBuilder()
    .setCustomId("admin_list")
    .setLabel("📦 一覧")
    .setStyle(ButtonStyle.Success)
);

      return interaction.reply({
        content: "🛠 管理パネル",
        components: [row],
         flags: 64
});
    }

  } catch (e) {
    console.error(e);
  }
});

// =======================
// 🔐 ログイン
// =======================
console.log("Bot起動開始");
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
client.login(process.env.DISCORD_TOKEN);
