const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('応答テスト')
    .toJSON(),

 new SlashCommandBuilder()
  .setName("search")
  .setDescription("検索")
  .addStringOption(option =>
    option
      .setName("query")
      .setDescription("検索ワード")
      .setRequired(true)
      .setAutocomplete(true) // ⭐これ
  )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('evolution')
    .setDescription('進化ツリー')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('クリスタ名')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('管理パネル')
    .toJSON()

];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('コマンド登録中...');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log('登録完了！');
  } catch (error) {
    console.error(error);
  }
})();