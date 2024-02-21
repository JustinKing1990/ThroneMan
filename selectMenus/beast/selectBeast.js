const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const { getDb } = require("../../mongoClient");
const MAX_EMBED_CHAR_LIMIT = 6000;

const splitTextIntoFields = (text, maxLength = 1024) => {
  let parts = [];
  while (text.length) {
    if (text.length <= maxLength) {
      parts.push(text);
      break;
    }

    let lastSpaceIndex = text.substring(0, maxLength).lastIndexOf(" ");

    if (lastSpaceIndex === -1) lastSpaceIndex = maxLength;

    let part = text.substring(0, lastSpaceIndex);
    text = text.substring(lastSpaceIndex + 1);
    parts.push(part);
  }
  return parts;
};

const createEmbeds = async (beast, interaction, imageUrl) => {
  const embeds = [];
  let currentEmbed = new EmbedBuilder().setColor("#0099ff");
  let currentEmbedSize = 0;

  const addEmbed = () => {
    embeds.push(currentEmbed);
    currentEmbed = new EmbedBuilder().setColor("#0099ff");
    currentEmbedSize = 0;
  };

  if (imageUrl) {
    currentEmbed.setImage(imageUrl);
    currentEmbedSize += imageUrl.length;
  }

  const addFieldToEmbed = (name, values) => {
    values.forEach((value, index) => {
      const fieldName = index === 0 ? name : `${name} (cont.)`;
      const fieldSize = fieldName.length + value.length;

      if (
        currentEmbedSize + fieldSize > MAX_EMBED_CHAR_LIMIT ||
        currentEmbed.data.fields?.length >= 25
      ) {
        addEmbed();
      }

      currentEmbed.addFields({ name: fieldName, value: value, inline: false });
      currentEmbedSize += fieldSize;
    });
  };

  const beastDetails = {
    Beast: [beast.name || "Unknown"],
    Habitat: [beast.habitat || "Unknown"],
    Appearance: [beast.appearance || "Unknown"],    
  };

  Object.entries(beastDetails).forEach(([name, value]) => {
    addFieldToEmbed(name, value);
  });

  if (currentEmbed.data.fields.length > 0) {
    addEmbed();
  }

  return embeds;
};

async function fetchRandomImage(beastName, interaction) {
  const targetChannelId = "1209676283794034728";
  const targetChannel = await interaction.client.channels.fetch(
    targetChannelId
  );
  const messages = await targetChannel.messages.fetch({ limit: 100 });

  const imageUrls = [];

  messages.forEach((message) => {
    if (message.author.bot && message.embeds.length > 0) {
      const embed = message.embeds[0];

      const hasBeastName =
        embed.fields &&
        embed.fields.some(
          (field) =>
            field.name === "Beast Name" && field.value.includes(beastName)
        );

      if (hasBeastName) {
        message.attachments.forEach((attachment) => {
          if (
            attachment.contentType &&
            attachment.contentType.startsWith("image/")
          ) {
            imageUrls.push(attachment.url);
          }
        });

        if (embed.image && embed.image.url) {
          imageUrls.push(embed.image.url);
        }
      }
    }
  });

  return imageUrls.length > 0
    ? imageUrls[Math.floor(Math.random() * imageUrls.length)]
    : null;
}

module.exports = async (interaction, client) => {
  const db = getDb();
  const beastCollection = db.collection("bestiary");
  const [SelectedBeastId] = interaction.values[0].split("::");

  try {
    const beast = await beastCollection.findOne({ name: SelectedBeastId });
    if (!beast) {
      await interaction.reply({ content: "Beast not found.", ephemeral: true });
      return;
    }

    const randomImageUrl = await fetchRandomImage(SelectedBeastId, interaction);
    const embeds = await createEmbeds(beast, interaction, randomImageUrl);

    const userHasKickPermission = interaction.member.permissions.has(
      PermissionsBitField.Flags.KickMembers
    );

    let components = [];
    if (userHasKickPermission) {
      const deleteButton = new ButtonBuilder()
        .setCustomId(`beastDelete_${SelectedBeastId}`)
        .setLabel("Delete Beast")
        .setStyle(ButtonStyle.Danger);
      components.push(new ActionRowBuilder().addComponents(deleteButton));
    }

    await interaction.reply({
      embeds: [embeds.shift()],
      components: [],
      ephemeral: true,
    });

    for (let embed of embeds) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if (beast.abilities && beast.abilities.length) {
      let partNumber = 0;
      let totalParts = beast.abilities.reduce(
        (acc, story) => acc + splitTextIntoFields(story, 1024).length,
        0
      );

      for (let story of beast.abilities) {
        const splitStory = splitTextIntoFields(story, 1024);
        for (let part of splitStory) {
          partNumber++;
          let isLastPart = partNumber === totalParts;
          await interaction.followUp({
            content: `**Abilities Part ${partNumber}**\n${part}`,
            ephemeral: true
          });
        }
      }
    } if (beast.significance && beast.significance.length) {
      let partNumber = 0;
      let totalParts = beast.significance.reduce(
        (acc, story) => acc + splitTextIntoFields(story, 1024).length,
        0
      );

      for (let story of beast.significance) {
        const splitSignificance = splitTextIntoFields(story, 1024);
        for (let part of splitSignificance) {
          partNumber++;
          let isLastPart = partNumber === totalParts;
          await interaction.followUp({
            content: `**Significance Part ${partNumber}**\n${part}`,
            ephemeral: true,
            components: isLastPart ? components : [],
          });
        }
      }
    } else {
      if (embeds.length === 0 && userHasKickPermission) {
        await interaction.followUp({
          content: "**Beast:** Not available",
          ephemeral: true,
          components,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching beast from the database:", error);
    await interaction.followUp({
      content: "An error occurred while fetching beast details.",
      ephemeral: true,
    });
  }
};
