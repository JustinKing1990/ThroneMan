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

const createEmbeds = async (beast, interaction) => {
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

  const beastDetails = {
    Beast: [beast.name || 'Unknown'],
    Habitat: [beast.habitat || 'Unknown'],
    Appearance: [beast.appearance || 'Unknown'],
  };

  Object.entries(beastDetails).forEach(([name, value]) => {
    addFieldToEmbed(name, value);
  });

  if (currentEmbed.data.fields.length > 0) {
    addEmbed();
  }

  return embeds;
};

async function fetchRandomImage(beastName, interaction, beastDoc = null) {
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
  
  // First check if beast document has imageUrls stored
  if (beastDoc && beastDoc.imageUrls && beastDoc.imageUrls.length > 0) {
    const validUrls = beastDoc.imageUrls.filter(url => !isUrlExpired(url));
    if (validUrls.length > 0) {
      return validUrls[Math.floor(Math.random() * validUrls.length)];
    }
  }
  
  try {
    const targetChannelId = '1209676283794034728';
    const targetChannel = await Promise.race([
      interaction.client.channels.fetch(targetChannelId).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    if (!targetChannel) return null;
    
    // Try to get beast creation date for smarter searching
    let creationDate = null;
    if (beastDoc) {
      if (beastDoc.createdAt) {
        creationDate = new Date(beastDoc.createdAt);
      } else if (beastDoc._id && beastDoc._id.getTimestamp) {
        creationDate = beastDoc._id.getTimestamp();
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

      const hasBeastName =
        embed.fields &&
        embed.fields.some(
          (field) => field.name === 'Beast Name' && field.value.includes(beastName),
        );

      if (hasBeastName) {
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
    if (imageUrls.length > 0 && beastDoc) {
      try {
        const db = getDb();
        await db.collection('bestiary').updateOne(
          { name: beastName },
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
  const beastCollection = db.collection('bestiary');
  const [SelectedBeastId] = interaction.values[0].split('::');

  try {
    const beast = await beastCollection.findOne({ name: SelectedBeastId });
    if (!beast) {
      await interaction.editReply({ content: 'Beast not found.' });
      return;
    }

    const randomImageUrl = await fetchRandomImage(SelectedBeastId, interaction, beast);
    const embeds = await createEmbeds(beast, interaction);

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
        .setCustomId(`beastDelete_${SelectedBeastId}`)
        .setLabel('Delete Beast')
        .setStyle(ButtonStyle.Danger);
      components.push(new ActionRowBuilder().addComponents(deleteButton));
    }

    await interaction.editReply({ embeds: [embeds.shift()], components: [] });

    for (let embed of embeds) {
      await interaction.followUp({ embeds: [embed], flags: [64] });
    }

    if (beast.abilities && beast.abilities.length) {
      let partNumber = 0;
      let totalParts = beast.abilities.reduce(
        (acc, story) => acc + splitTextIntoFields(story, 1024).length,
        0,
      );

      for (let story of beast.abilities) {
        const splitStory = splitTextIntoFields(story, 1024);
        for (let part of splitStory) {
          partNumber++;
          await interaction.followUp({
            content: `**Abilities Part ${partNumber}**\n${part}`,
            flags: [64],
          });
        }
      }
    }
    if (beast.significance && beast.significance.length) {
      let partNumber = 0;
      let totalParts = beast.significance.reduce(
        (acc, story) => acc + splitTextIntoFields(story, 1024).length,
        0,
      );

      for (let story of beast.significance) {
        const splitSignificance = splitTextIntoFields(story, 1024);
        for (let part of splitSignificance) {
          partNumber++;
          await interaction.followUp({
            content: `**Significance Part ${partNumber}**\n${part}`,
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
        content: 'An error occurred while fetching beast details.',
      });
    } catch (e) {
      // Silent fail
    }
  }
};
