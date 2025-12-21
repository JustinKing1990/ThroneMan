/**
 * Handle location selection from dropdown
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getDb } = require('../../mongoClient');

const splitTextIntoFields = (text, maxLength = 1024) => {
  if (!text || text.length === 0) return [''];
  
  let parts = [];
  let remaining = String(text);
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    let splitPoint = maxLength;
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength);
    if (paragraphBreak > maxLength * 0.3) {
      splitPoint = paragraphBreak;
    } else {
      const lineBreak = remaining.lastIndexOf('\n', maxLength);
      if (lineBreak > maxLength * 0.3) {
        splitPoint = lineBreak;
      } else {
        const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
        if (sentenceEnd > maxLength * 0.3) {
          splitPoint = sentenceEnd + 1;
        }
      }
    }

    let part = remaining.substring(0, splitPoint).trim();
    remaining = remaining.substring(splitPoint).trim();
    
    if (part.length === 0 && remaining.length > 0) {
      part = remaining.substring(0, maxLength);
      remaining = remaining.substring(maxLength);
    }
    
    if (part.length > 0) {
      parts.push(part);
    }
  }
  
  return parts.length > 0 ? parts : [''];
};

async function fetchRandomImage(locationName, userId, interaction, locationDoc = null) {
  const isUrlExpired = (url) => {
    if (!url) return true;
    const match = url.match(/ex=([0-9a-f]+)/i);
    if (match) {
      const expiryTimestamp = parseInt(match[1], 16);
      return Date.now() / 1000 > expiryTimestamp;
    }
    return false;
  };

  if (locationDoc && locationDoc.imageUrls && locationDoc.imageUrls.length > 0) {
    const validUrls = locationDoc.imageUrls.filter(url => !isUrlExpired(url));
    if (validUrls.length > 0) {
      return validUrls[Math.floor(Math.random() * validUrls.length)];
    }
  }

  // Fallback: search the image channel
  const targetChannelId = '1451795171434823852';
  try {
    const targetChannel = await interaction.client.channels.fetch(targetChannelId).catch(() => null);
    if (!targetChannel) return null;

    const messages = await targetChannel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return null;

    const imageUrls = [];
    messages.forEach((message) => {
      if (message.author.bot && message.embeds.length > 0) {
        const embed = message.embeds[0];
        const hasLocationName = embed.fields?.some((field) => field.value.includes(locationName));
        if (hasLocationName) {
          message.attachments.forEach((att) => {
            if (att.contentType?.startsWith('image/')) {
              imageUrls.push(att.url);
            }
          });
        }
      }
    });

    return imageUrls.length > 0 ? imageUrls[Math.floor(Math.random() * imageUrls.length)] : null;
  } catch (e) {
    return null;
  }
}

module.exports = async (interaction, _client) => {
  try {
    await interaction.deferReply({ flags: 64 });
  } catch (e) {
    return;
  }

  // Reset the select menu to default (no selection) by updating the original message
  try {
    const originalMessage = interaction.message;
    if (originalMessage && originalMessage.components.length > 0) {
      const updatedComponents = originalMessage.components.map(row => {
        return ActionRowBuilder.from(row);
      });
      await interaction.message.edit({ components: updatedComponents });
    }
  } catch (err) {
    // Silently fail if we can't reset the menu
  }

  const db = getDb();
  const locationsCollection = db.collection('locations');
  const selectedLocationName = interaction.values[0];

  try {
    // Try exact match first, then startsWith for truncated names
    let location = await locationsCollection.findOne({ name: selectedLocationName });
    
    if (!location && selectedLocationName.endsWith('...')) {
      // Name was truncated, search by prefix
      const prefix = selectedLocationName.slice(0, -3);
      location = await locationsCollection.findOne({ 
        name: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` } 
      });
    }

    if (!location) {
      await interaction.editReply({ content: '❌ Location not found.' });
      return;
    }

    // Build embeds
    const embeds = [];
    let currentEmbed = new EmbedBuilder().setColor('#2ecc71');
    let currentSize = 0;

    const addField = (name, value) => {
      if (!value || value.length === 0) return;
      
      const parts = splitTextIntoFields(value, 1024);
      parts.forEach((part, idx) => {
        const fieldName = idx === 0 ? name : `${name} (cont.)`;
        const fieldSize = fieldName.length + part.length;

        if (currentSize + fieldSize > 5500 || (currentEmbed.data.fields?.length || 0) >= 25) {
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder().setColor('#2ecc71');
          currentSize = 0;
        }

        currentEmbed.addFields({ name: fieldName, value: part, inline: false });
        currentSize += fieldSize;
      });
    };

    // Get creator name
    let creatorName = 'Unknown';
    try {
      const member = await interaction.guild.members.fetch(location.userId).catch(() => null);
      if (member) creatorName = member.displayName;
    } catch (e) {}

    // Add fields in logical order
    const fieldOrder = [
      { key: 'name', label: '📍 Name' },
      { key: 'continent', label: '🌍 Continent' },
      { key: 'region', label: '🗺️ Region' },
      { key: 'province', label: '📍 Province' },
      { key: 'territory', label: '🏴 Territory' },
      { key: 'population', label: '👥 Population' },
      { key: 'government', label: '🏛️ Government' },
      { key: 'defense', label: '🛡️ Defense' },
      { key: 'commerce', label: '💰 Commerce' },
      { key: 'organizations', label: '🏢 Organizations' },
      { key: 'description', label: '📜 Description' },
      { key: 'crime', label: '🗡️ Crime' },
      { key: 'geography', label: '🗺️ Geography' },
      { key: 'laws', label: '⚖️ Laws' },
      { key: 'climate', label: '🌤️ Climate' },
      { key: 'history', label: '📚 History' },
      { key: 'culture', label: '🎭 Culture' },
      { key: 'notable', label: '⭐ Notable' },
      { key: 'factions', label: '⚔️ Factions' },
    ];

    currentEmbed.setTitle(`📍 ${location.name}`);
    currentEmbed.setDescription(`Created by: ${creatorName}`);

    for (const { key, label } of fieldOrder) {
      if (key !== 'name' && location[key]) {
        addField(label, location[key]);
      }
    }

    if (currentEmbed.data.fields?.length > 0 || embeds.length === 0) {
      embeds.push(currentEmbed);
    }

    // Try to get an image - create separate image embed at the end
    const imageUrl = await fetchRandomImage(location.name, location.userId, interaction, location);
    let imageEmbed = null;
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      try {
        imageEmbed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setImage(imageUrl);
      } catch (e) {
        console.error('Failed to create image embed:', e.message);
      }
    }

    // Add action buttons if user owns this location or is staff
    const isOwner = location.userId === interaction.user.id;
    const isStaff = interaction.member.permissions.has('KickMembers');

    const components = [];
    if (isOwner || isStaff) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`editLocation_${location.name}_${location.userId}`)
          .setLabel('Edit')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`locationDelete_${location.name}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger),
      );
      components.push(row);
    }

    // Add image embed at the end if we have one
    if (imageEmbed) {
      embeds.push(imageEmbed);
    }

    await interaction.editReply({
      embeds,
      components,
    });
  } catch (error) {
    console.error('Error displaying location:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching location details.',
    });
  }
};
