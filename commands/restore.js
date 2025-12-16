const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
} = require('discord.js');
const { getDb } = require('../mongoClient');

const archiveMapping = {
  characterArchive: { target: 'characters', label: 'Character', idField: 'userId' },
  importantCharacterArchive: {
    target: 'importantCharacters',
    label: 'Important Character',
    idField: 'userId',
  },
  loreArchive: { target: 'lore', label: 'Lore', idField: 'name' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restore entries from archives back to their main collections.')
    .addStringOption((option) =>
      option
        .setName('archive')
        .setDescription('The archive to restore from.')
        .setRequired(true)
        .addChoices(
          { name: 'Characters', value: 'characterArchive' },
          { name: 'Important Characters', value: 'importantCharacterArchive' },
          { name: 'Lore', value: 'loreArchive' },
        ),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  async execute(interaction) {
    const archiveName = interaction.options.getString('archive');
    const mapping = archiveMapping[archiveName];
    const db = getDb();
    const archiveCol = db.collection(archiveName);

    await interaction.deferReply({ flags: 64 });

    try {
      const archivedDocs = await archiveCol.find({}).limit(25).toArray();

      if (archivedDocs.length === 0) {
        await interaction.editReply({
          content: `No entries found in ${mapping.label} archive.`,
        });
        return;
      }

      const options = archivedDocs.map((doc) => {
        const label = doc.name.length > 25 ? doc.name.substring(0, 22) + '...' : doc.name;
        const identifier = mapping.idField === 'userId' ? doc.userId : doc.name;
        return {
          label,
          value: identifier,
          description: mapping.idField === 'userId' ? `User ID: ${doc.userId}` : undefined,
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`restore_${archiveName}`)
        .setPlaceholder(`Select ${mapping.label.toLowerCase()} to restore`)
        .setMinValues(1)
        .setMaxValues(Math.min(options.length, 25))
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.editReply({
        content: `Found ${archivedDocs.length} archived ${mapping.label.toLowerCase()}(s). Select entries to restore:`,
        components: [row],
      });
    } catch (err) {
      console.error('Restore command error:', err);
      await interaction.editReply({
        content: 'An error occurred while fetching archived entries.',
      });
    }
  },
};
