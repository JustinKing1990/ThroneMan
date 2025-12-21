const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');
const https = require('https');
const http = require('http');

// Helper to download an image from URL and return as buffer
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      // Handle redirects
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
    }).on('error', reject);
  });
}

// Modified to accept imageUrls parameter
async function postCharacterInfo(interaction, client, characterName, imageUrls = []) {
  const db = getDb();
  const charactersCollection = db.collection('characterPending');

  const characterData = await charactersCollection.findOne({
    userId: interaction.user.id,
    name: characterName,
  });
  if (!characterData) {
    console.error('No character data found for the user.');
    throw new Error('No character data found. Please try again.');
  }

  // Build embeds similar to important character
  const embeds = [];
  const skipKeys = new Set(['userId', 'updatedAt', 'createdAt', 'messageIds', 'imageUrls', '_id']);
  
  const fieldOrder = [
    'name', 'title', 'gender', 'age', 'birthplace', 'height', 'species',
    'eyecolor', 'haircolor', 'appearance', 'weapons', 'armor', 'beliefs',
    'powers', 'backstory'
  ];
  
  const niceNames = {
    name: 'Name',
    title: 'Title',
    gender: 'Gender',
    age: 'Age',
    birthplace: 'Birthplace',
    height: 'Height',
    species: 'Species',
    eyecolor: 'Eye Color',
    haircolor: 'Hair Color',
    appearance: 'Appearance',
    weapons: 'Weapons',
    armor: 'Armor',
    beliefs: 'Beliefs',
    powers: 'Powers',
    backstory: 'Backstory'
  };

  let currentEmbed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`Character Submission`)
    .setDescription(`**Submitted by:** ${interaction.user.username}`);
  
  let currentEmbedSize = 100;
  let fieldCount = 0;

  const addFieldToEmbed = (name, value, inline = false) => {
    const fieldSize = name.length + value.length + 50;
    
    if (currentEmbedSize + fieldSize > 4000 || fieldCount >= 20) {
      embeds.push(currentEmbed);
      currentEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Character (continued)`);
      currentEmbedSize = 60;
      fieldCount = 0;
    }
    
    currentEmbed.addFields({ name, value, inline });
    currentEmbedSize += fieldSize;
    fieldCount++;
  };

  // Process fields in order
  for (const key of fieldOrder) {
    if (!characterData[key] || characterData[key] === '' || skipKeys.has(key)) continue;
    
    const displayName = niceNames[key] || key;
    const rawValue = Array.isArray(characterData[key]) ? characterData[key].join('\n') : String(characterData[key]);
    
    const isShortField = ['name', 'title', 'gender', 'age', 'birthplace', 'height', 'species', 'eyecolor', 'haircolor'].includes(key);
    
    if (rawValue.length <= 1024) {
      addFieldToEmbed(displayName, rawValue, isShortField && rawValue.length < 100);
    } else {
      // Split long content into multiple fields
      let remaining = rawValue;
      let partNum = 1;
      
      while (remaining.length > 0) {
        let splitPoint = 1020;
        if (remaining.length > 1020) {
          const paragraphBreak = remaining.lastIndexOf('\n\n', 1020);
          const lineBreak = remaining.lastIndexOf('\n', 1020);
          const sentenceBreak = remaining.lastIndexOf('. ', 1020);
          
          if (paragraphBreak > 500) splitPoint = paragraphBreak;
          else if (lineBreak > 500) splitPoint = lineBreak;
          else if (sentenceBreak > 500) splitPoint = sentenceBreak + 1;
        } else {
          splitPoint = remaining.length;
        }
        
        const chunkName = partNum === 1 ? displayName : `${displayName} (Part ${partNum})`;
        addFieldToEmbed(chunkName, remaining.substring(0, splitPoint).trim(), false);
        remaining = remaining.substring(splitPoint).trim();
        partNum++;
      }
    }
  }

  // Push the final embed
  embeds.push(currentEmbed);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approveCharacter_${characterData.userId}_${characterData.name}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`denyCharacter_${characterData.userId}_${characterData.name}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger),
  );

  const targetChannel = await interaction.client.channels.fetch('1206393672271134770');
  if (!targetChannel) {
    throw new Error('Approval channel not found. Please contact an administrator.');
  }
  
  const sentMessagesIds = [];

  // Convert base64 images to attachments if present
  const imageAttachments = [];
  const storedImages = characterData.imageUrls || [];
  
  // First, handle any base64 images stored in the database
  if (storedImages.length > 0) {
    for (let i = 0; i < storedImages.length; i++) {
      const dataUrl = storedImages[i];
      if (dataUrl.startsWith('data:')) {
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const extension = mimeType.split('/')[1] || 'png';
          const attachment = new AttachmentBuilder(buffer, { name: `image_${i + 1}.${extension}` });
          imageAttachments.push(attachment);
        }
      }
    }
  }

  // Also handle Discord attachment URLs passed from the collector
  // Download and re-upload them to preserve them (original message gets deleted)
  const discordImageUrls = imageUrls.filter(url => url && !url.startsWith('data:'));
  const downloadedAttachments = [];
  
  for (let i = 0; i < discordImageUrls.length; i++) {
    try {
      const url = discordImageUrls[i];
      const buffer = await downloadImage(url);
      // Extract filename from URL or use default
      const urlPath = url.split('?')[0];
      const filename = urlPath.split('/').pop() || `image_${i + 1}.png`;
      const attachment = new AttachmentBuilder(buffer, { name: filename });
      downloadedAttachments.push(attachment);
    } catch (e) {
      // Failed to download, skip this image
    }
  }

  // Send all embeds first (without buttons or images)
  for (let i = 0; i < embeds.length; i++) {
    const sentMessage = await targetChannel.send({
      embeds: [embeds[i]],
    });
    sentMessagesIds.push(sentMessage.id);
  }

  // Send downloaded images as actual attachments in batches of 4
  const reuploadedUrls = [];
  const IMAGES_PER_MESSAGE = 4;
  if (downloadedAttachments.length > 0) {
    const totalBatches = Math.ceil(downloadedAttachments.length / IMAGES_PER_MESSAGE);
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * IMAGES_PER_MESSAGE;
      const batchAttachments = downloadedAttachments.slice(batchStart, batchStart + IMAGES_PER_MESSAGE);
      
      const imageRange = batchAttachments.length === 1 
        ? `Image ${batchStart + 1}`
        : `Images ${batchStart + 1}-${batchStart + batchAttachments.length}`;
      
      const imgMsg = await targetChannel.send({
        content: `**${imageRange}** for character submission:`,
        files: batchAttachments,
      });
      sentMessagesIds.push(imgMsg.id);
      // Get the new permanent URLs from the uploaded attachments
      imgMsg.attachments.forEach((att) => {
        reuploadedUrls.push(att.url);
      });
    }
  }

  // Send base64 images (if any) and buttons as the final message
  const finalMessageOptions = {
    components: [row],
  };

  let contentParts = [];
  // Ping everyone who can see the channel
  contentParts.push('@here - New character submission for review!');
  if (imageAttachments.length > 0) {
    contentParts.push(`**Attached Images (${imageAttachments.length}):**`);
    finalMessageOptions.files = imageAttachments;
  }
  if (downloadedAttachments.length > 0 && imageAttachments.length === 0) {
    contentParts.push(`**Images (${downloadedAttachments.length}) uploaded above**`);
  }
  if (contentParts.length > 0) {
    finalMessageOptions.content = contentParts.join('\n');
  }

  const finalMessage = await targetChannel.send(finalMessageOptions);
  sentMessagesIds.push(finalMessage.id);

  // Store the re-uploaded image URLs (permanent) in the pending document
  const allImageUrls = [...storedImages, ...reuploadedUrls];

  // Update the pending document with the message IDs for future reference
  await charactersCollection.updateOne(
    { userId: interaction.user.id, name: characterName },
    { $set: { messageIds: sentMessagesIds, imageUrls: allImageUrls } },
  );
}

module.exports = postCharacterInfo;
