const { getDb } = require("../../mongoClient");
const ensureMessagePosted = require("../../helpercommands/postTrackedMessage");
const updateListMessage = require("../../helpercommands/updateListMessage");
const config = require("../../env/config.json");
const fs = require("fs");
const path = require("path");
const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");

async function handleDeleteLoreInteraction(interaction) {
  const db = getDb();
  const settingsCollection = db.collection("settings");
  const beastCollection = db.collection("bestiary");
  const beastArchiveCollection = db.collection("bestiaryArchive");
  const targetChannel = await interaction.client.channels
    .fetch("1209676283794034728")
    .catch(console.error);

  const [action, beastId] = interaction.customId.split("_");

  if (
    interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)
  ) {
    try {
      const beastToArchive = await beastCollection.findOne({ name: beastId });
      if (beastToArchive) {
        await beastArchiveCollection.insertOne(beastToArchive);
        const deletionResult = await beastCollection.deleteOne({
          name: beastId,
        });

        if (deletionResult.deletedCount === 0) {
          await interaction.reply({
            content:
              "No beast found or you do not have permission to delete this beast.",
            ephemeral: true,
          });
          return;
        } else {
          const messages = await targetChannel.messages.fetch({ limit: 100 });
          messages.forEach(async (message) => {
            if (message.author.bot && message.embeds.length > 0) {
              const embed = message.embeds[0];
              const hasBeastName =
                embed.fields &&
                embed.fields.some((field) => field.value.includes(beastId));
              if (hasBeastName) {
                await message.delete().catch(console.error);
              }
            }
          });
          await interaction.reply({
            content: "Beast successfully deleted and archived.",
            ephemeral: true,
          });
        }
      } else {
        await interaction.reply({
          content: "Beast not found for archiving and deletion.",
          ephemeral: true,
        });
        return;
      }
    } catch (error) {
      console.error("Error archiving and deleting best:", error);
      await interaction.reply({
        content:
          "An error occurred while trying to archive and delete the beast.",
        ephemeral: true,
      });
      return;
    }
  } else {
    await interaction.reply({
      content: "You do not have permission to delete this beast.",
      ephemeral: true,
    });
    return;
  }

  try {
    let newBeastCollection = db.collection("beast");
    await updateListMessage(
      null,
      interaction,
      newBeastCollection,
      settingsCollection,
      config.bestiaryChannelId,
      config.bestiaryMessageId,
      "Beast"
    );
  } catch (error) {
    console.error("Error updating beast list message:", error);
  }
}

module.exports = handleDeleteLoreInteraction;
