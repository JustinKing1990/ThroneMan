const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');
const { getDb } = require('../../mongoClient');
const MAX_EMBED_CHAR_LIMIT = 6000;

const splitTextIntoFields = (text, maxLength = 1024) => {
  let parts = [];
  while (text.length) {
    if (text.length <= maxLength) {
      parts.push(text);
      break;
    }

    let lastSpaceIndex = text.substring(0, maxLength).lastIndexOf(' ');

    if (lastSpaceIndex === -1) lastSpaceIndex = maxLength;

    let part = text.substring(0, lastSpaceIndex);
    text = text.substring(lastSpaceIndex + 1);
    parts.push(part);
  }
  return parts;
};

const createEmbeds = async (lore, interaction) => {
  const embeds = [];
  let currentEmbed = new EmbedBuilder().setColor('#0099ff');
  let currentEmbedSize = 0;

  const addEmbed = () => {
    embeds.push(currentEmbed);
    currentEmbed = new EmbedBuilder().setColor('#0099ff');
    currentEmbedSize = 0;
  };

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

  const loreDetails = {
    Lore: [lore.name || 'Unknown'],
  };

  Object.entries(loreDetails).forEach(([name, value]) => {
    addFieldToEmbed(name, value);
  });

  if (currentEmbed.data.fields.length > 0) {
    addEmbed();
  }

  return embeds;
};

async function fetchRandomImage(loreName, interaction, loreDoc = null) {
  // Helper to check if a Discord CDN URL is expired
  const isUrlExpired = (url) => {
    if (!url) return true;
    const match = url.match(/ex=([0-9a-f]+)/i);
    if (match) {
      const expiryTimestamp = parseInt(match[1], 16);
      return Date.now() / 1000 > expiryTimestamp;
    }
    return false;
  };
  
  // Helper to convert a Date to a Discord snowflake ID
  const dateToSnowflake = (date) => {
    const discordEpoch = 1420070400000n;
    const timestamp = BigInt(date.getTime());
    return String((timestamp - discordEpoch) << 22n);
  };
  
  // First check if lore document has imageUrls stored
  if (loreDoc && loreDoc.imageUrls && loreDoc.imageUrls.length > 0) {
    const validUrls = loreDoc.imageUrls.filter(url => !isUrlExpired(url));
    if (validUrls.length > 0) {
      return validUrls[Math.floor(Math.random() * validUrls.length)];
    }
  }
  
  try {
    const targetChannelId = '1207398646035910726';
    const targetChannel = await Promise.race([
      interaction.client.channels.fetch(targetChannelId).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    if (!targetChannel) return null;
    
    // Try to get lore creation date for smarter searching
    let creationDate = null;
    if (loreDoc) {
      if (loreDoc.createdAt) {
        creationDate = new Date(loreDoc.createdAt);
      } else if (loreDoc._id && loreDoc._id.getTimestamp) {
        creationDate = loreDoc._id.getTimestamp();
      }
    }
    
    let messages = null;
    
    // If we have a creation date, search around that time
    if (creationDate) {
      const searchDate = new Date(creationDate.getTime() + 24 * 60 * 60 * 1000);
      const snowflakeId = dateToSnowflake(searchDate);
      messages = await Promise.race([
        targetChannel.messages.fetch({ limit: 100, before: snowflakeId }).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
    }
    
    // Fallback to recent messages
    if (!messages || messages.size === 0) {
      messages = await Promise.race([
        targetChannel.messages.fetch({ limit: 100 }).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
    }
    
    if (!messages) return null;

  const imageUrls = [];

  messages.forEach((message) => {
    if (message.author.bot && message.embeds.length > 0) {
      const embed = message.embeds[0];

      const hasLoreName =
        embed.fields &&
        embed.fields.some((field) => field.name === 'Lore Name' && field.value.includes(loreName));

      if (hasLoreName) {
        message.attachments.forEach((attachment) => {
          if (attachment.contentType && attachment.contentType.startsWith('image/')) {
            imageUrls.push(attachment.url);
          }
        });

        if (embed.image && embed.image.url) {
          imageUrls.push(embed.image.url);
        }
      }
    }
  });

    // If we found fresh URLs, update the database
    if (imageUrls.length > 0 && loreDoc) {
      try {
        const db = getDb();
        await db.collection('lore').updateOne(
          { name: loreName },
          { $set: { imageUrls: imageUrls } }
        );
      } catch (e) {
        // Non-fatal
      }
    }

    return imageUrls.length > 0 ? imageUrls[Math.floor(Math.random() * imageUrls.length)] : null;
  } catch (e) {
    return null;
  }
}

module.exports = async (interaction, _client) => {
  // Defer immediately to prevent timeout
  try {
    await interaction.deferReply({ flags: 64 });
  } catch (deferError) {
    return;
  }

  const db = getDb();
  const loreCollection = db.collection('lore');
  const [SelectedLoreId] = interaction.values[0].split('::');

  try {
    const lore = await loreCollection.findOne({ name: SelectedLoreId });
    if (!lore) {
      await interaction.editReply({ content: 'Lore not found.' });
      return;
    }

    const randomImageUrl = await fetchRandomImage(SelectedLoreId, interaction, lore);
    const embeds = await createEmbeds(lore, interaction);

    const userHasKickPermission = interaction.member.permissions.has(
      PermissionsBitField.Flags.KickMembers,
    );

    let components = [];
    let imageEmbed = null;
    if (randomImageUrl) {
      imageEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setImage(randomImageUrl);
    }
    if (userHasKickPermission) {
      const deleteButton = new ButtonBuilder()
        .setCustomId(`loreDelete_${SelectedLoreId}`)
        .setLabel('Delete Lore')
        .setStyle(ButtonStyle.Danger);
      components.push(new ActionRowBuilder().addComponents(deleteButton));
    }

    await interaction.editReply({ embeds: [embeds.shift()], components: [] });

    for (let embed of embeds) {
      await interaction.followUp({ embeds: [embed], flags: [64] });
    }

    if (lore.info && lore.info.length) {
      let partNumber = 0;
      let totalParts = lore.info.reduce(
        (acc, story) => acc + splitTextIntoFields(story, 1024).length,
        0,
      );

      for (let story of lore.info) {
        const splitStory = splitTextIntoFields(story, 1024);
        for (let part of splitStory) {
          partNumber++;
          await interaction.followUp({
            content: `**Details Part ${partNumber}**\n${part}`,
            flags: [64],
          });
        }
      }
    }

    // Send image at the end with delete button
    if (imageEmbed) {
      await interaction.followUp({
        embeds: [imageEmbed],
        flags: [64],
        components,
      });
    } else if (userHasKickPermission) {
      await interaction.followUp({
        content: '\u200b',
        flags: [64],
        components,
      });
    }
  } catch (error) {
    try {
      await interaction.editReply({
        content: 'An error occurred while fetching lore details.',
      });
    } catch (e) {
      // Silent fail
    }
  }
};
