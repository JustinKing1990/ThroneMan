const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');
const https = require('https');
const http = require('http');

// Helper to download an image from URL and return as buffer
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('syncimportantimages')
    .setDescription('Consolidates important character image messages and fixes broken URLs.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  async execute(interaction) {
    await interaction.deferReply({ flags: [64] });
    // Important characters use a different channel - let me check the correct one
    const channelId = '1206381988559323166'; // Same channel for now, update if different
    const channel = await interaction.client.channels.fetch(channelId);
    const db = getDb();
    const charactersCollection = db.collection('importantCharacters');

    if (!channel.isTextBased()) {
      await interaction.editReply('The specified channel is not text-based.');
      return;
    }

    await interaction.editReply('🔄 Scanning channel for important character images...');

    // Step 1: Collect all messages and group by character
    const characterImages = new Map();
    let messages;
    let lastId;
    let totalMessages = 0;

    while (true) {
      messages = await channel.messages.fetch({ limit: 100, ...(lastId && { before: lastId }) });
      if (messages.size === 0) break;
      totalMessages += messages.size;

      for (const message of messages.values()) {
        for (const embed of message.embeds) {
          const characterNameField = embed.fields.find((field) => field.name === 'Character Name');
          const ownerIdField = embed.fields.find((field) => field.name === 'Owner ID' || field.name === 'User ID');
          
          if (characterNameField) {
            const characterName = characterNameField.value;
            const ownerId = ownerIdField?.value || null;
            
            // Check if this is an important character
            const isImportant = await charactersCollection.findOne({ name: characterName });
            if (!isImportant) continue;
            
            if (!characterImages.has(characterName)) {
              characterImages.set(characterName, {
                userId: ownerId,
                messages: [],
                imageUrls: [],
                attachments: []
              });
            }
            
            const charData = characterImages.get(characterName);
            charData.messages.push(message);
            
            if (embed.image?.url) {
              charData.imageUrls.push(embed.image.url);
            }
            
            message.attachments.forEach((att) => {
              if (att.contentType?.startsWith('image/')) {
                charData.attachments.push({ url: att.url, name: att.name });
              }
            });
          }
        }
      }

      lastId = messages.lastKey();
    }

    await interaction.editReply(`📊 Found ${totalMessages} messages for ${characterImages.size} important characters. Processing...`);

    let consolidatedCount = 0;
    let fixedUrlCount = 0;
    let deletedMessageCount = 0;

    for (const [characterName, charData] of characterImages) {
      const allUrls = [...new Set([...charData.imageUrls, ...charData.attachments.map(a => a.url)])];
      
      if (allUrls.length === 0) continue;

      const characterDoc = await charactersCollection.findOne({ name: characterName });
      const userId = charData.userId || characterDoc?.userId || 'Unknown';

      const validImages = [];
      for (let i = 0; i < allUrls.length; i++) {
        const url = allUrls[i];
        try {
          const buffer = await downloadImage(url);
          const filename = url.split('?')[0].split('/').pop() || `image_${i + 1}.png`;
          validImages.push({ buffer, filename });
        } catch {
          fixedUrlCount++;
        }
      }

      if (validImages.length === 0) continue;

      const needsConsolidation = charData.messages.length > 1 || 
        validImages.length !== allUrls.length ||
        charData.messages.length !== Math.ceil(validImages.length / 1);

      if (!needsConsolidation) continue;

      for (const msg of charData.messages) {
        try {
          await msg.delete();
          deletedMessageCount++;
        } catch (e) {
          // Message may already be deleted
        }
      }

      const newMessageIds = [];
      const newImageUrls = [];
      const IMAGES_PER_MESSAGE = 4;

      for (let batch = 0; batch < Math.ceil(validImages.length / IMAGES_PER_MESSAGE); batch++) {
        const batchImages = validImages.slice(batch * IMAGES_PER_MESSAGE, (batch + 1) * IMAGES_PER_MESSAGE);
        const batchNumber = Math.ceil(validImages.length / IMAGES_PER_MESSAGE) > 1 ? ` (${batch + 1}/${Math.ceil(validImages.length / IMAGES_PER_MESSAGE)})` : '';
        
        const attachments = batchImages.map((img, idx) => 
          new AttachmentBuilder(img.buffer, { name: `${characterName.replace(/[^a-zA-Z0-9]/g, '_')}_${batch * IMAGES_PER_MESSAGE + idx + 1}.png` })
        );

        const embed = new EmbedBuilder()
          .setColor('#5865F2') // Different color for important characters
          .setTitle(`⭐ Important Character Images${batchNumber}`)
          .addFields(
            { name: 'Character Name', value: characterName, inline: true },
            { name: 'Owner ID', value: userId, inline: true },
            { name: 'Images', value: `${batchImages.length} image(s)`, inline: true }
          )
          .setTimestamp();

        try {
          const sentMsg = await channel.send({
            embeds: [embed],
            files: attachments
          });
          newMessageIds.push(sentMsg.id);

          sentMsg.attachments.forEach((att) => {
            newImageUrls.push(att.url);
          });

          consolidatedCount++;
        } catch (e) {
          console.error(`Failed to send consolidated message for ${characterName}:`, e);
        }
      }

      if (characterDoc && newImageUrls.length > 0) {
        await charactersCollection.updateOne(
          { _id: characterDoc._id },
          {
            $set: {
              imageUrls: newImageUrls,
              imageMessageIds: newMessageIds,
              updatedAt: new Date()
            }
          }
        );
      }
    }

    const summary = [
      '✅ **Important Characters Sync Complete!**',
      `📁 Characters processed: ${characterImages.size}`,
      `🗑️ Old messages deleted: ${deletedMessageCount}`,
      `📦 New consolidated messages: ${consolidatedCount}`,
      `🔧 Broken URLs found: ${fixedUrlCount}`
    ].join('\n');

    await interaction.editReply(summary);
  },
};
