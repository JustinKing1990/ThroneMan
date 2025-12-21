const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');

async function postImportantCharacterInfo(interaction, client, characterName, imageUrls) {
  const db = getDb();
  const charactersCollection = db.collection('importantCharacterPending');

  const characterData = await charactersCollection.findOne({
    userId: interaction.user.id,
    name: characterName,
  });
  if (!characterData) {
    throw new Error('No character data found. Please try again.');
  }

  // Build embeds similar to how the user sees their submission
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
    .setTitle(`Important Character Submission`)
    .setDescription(`**Submitted by:** ${interaction.user.username}`);
  
  let currentEmbedSize = 100;
  let fieldCount = 0;

  const addFieldToEmbed = (name, value, inline = false) => {
    const fieldSize = name.length + value.length + 50;
    
    if (currentEmbedSize + fieldSize > 4000 || fieldCount >= 20) {
      embeds.push(currentEmbed);
      currentEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Important Character (continued)`);
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
      .setCustomId(`approveImportantCharacter_${characterData.userId}_${characterData.name}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`denyImportantCharacter_${characterData.userId}_${characterData.name}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger),
  );

  const targetChannel = await interaction.client.channels.fetch('1207157063357177947');
  if (!targetChannel) {
    throw new Error('Approval channel not found. Please contact an administrator.');
  }
  
  const sentMessagesIds = [];

  // Convert base64 images to attachments if present
  const imageAttachments = [];
  const storedImages = characterData.imageUrls || [];
  
  if (storedImages.length > 0) {
    for (let i = 0; i < storedImages.length; i++) {
      const dataUrl = storedImages[i];
      if (dataUrl.startsWith('data:')) {
        // Extract base64 data
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

  // Send all embeds first (without buttons or images)
  for (let i = 0; i < embeds.length; i++) {
    const sentMessage = await targetChannel.send({
      embeds: [embeds[i]],
    });
    sentMessagesIds.push(sentMessage.id);
  }

  // Send images (if any) and buttons as the final message
  const finalMessageOptions = {
    components: [row],
  };

  let contentParts = [];
  // Ping everyone who can see the channel
  contentParts.push('@here - New important character submission for review!');
  if (imageAttachments.length > 0) {
    contentParts.push(`**Attached Images (${imageAttachments.length}):**`);
    finalMessageOptions.files = imageAttachments;
  }
  if (contentParts.length > 0) {
    finalMessageOptions.content = contentParts.join('\n');
  }

  const finalMessage = await targetChannel.send(finalMessageOptions);
  sentMessagesIds.push(finalMessage.id);

  console.log(`[postImportantCharacterInfo] Sent ${embeds.length} embed(s) with ${imageAttachments.length} image(s)`);

  // Update the pending document with the message IDs for future reference
  await charactersCollection.updateOne(
    { userId: interaction.user.id, name: characterName },
    { $set: { messageIds: sentMessagesIds } },
  );
}

module.exports = postImportantCharacterInfo;
