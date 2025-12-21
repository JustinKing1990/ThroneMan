const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const { getDb } = require('../mongoClient');
const https = require('https');

// Quick URL validation
async function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ valid: false, reason: 'Empty URL' });
      return;
    }
    
    // Clean the URL first
    let cleanUrl = url.split('&=&')[0]; // Remove Discord proxy params
    if (cleanUrl.endsWith('&')) cleanUrl = cleanUrl.slice(0, -1);
    
    const request = https.get(cleanUrl, (response) => {
      if (response.statusCode === 200) {
        resolve({ valid: true, status: response.statusCode });
      } else {
        resolve({ valid: false, status: response.statusCode, reason: `HTTP ${response.statusCode}` });
      }
      response.destroy();
    });
    
    request.on('error', (err) => {
      resolve({ valid: false, reason: err.message });
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      resolve({ valid: false, reason: 'Timeout' });
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debugimages')
    .setDescription('Debug character image URLs stored in database')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addStringOption(option =>
      option.setName('character')
        .setDescription('Character name to check')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('removebroken')
        .setDescription('Remove broken/inaccessible URLs from database')
        .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ flags: [64] });
    
    const characterName = interaction.options.getString('character');
    const removeBroken = interaction.options.getBoolean('removebroken') || false;
    const db = getDb();
    
    // Check both collections
    let collection = 'characters';
    let character = await db.collection('characters').findOne({ name: characterName });
    if (!character) {
      character = await db.collection('importantCharacters').findOne({ name: characterName });
      collection = 'importantCharacters';
    }
    
    if (!character) {
      await interaction.editReply(`Character "${characterName}" not found.`);
      return;
    }
    
    const imageUrls = character.imageUrls || [];
    const messageIds = character.imageMessageIds || [];
    const imageChannelId = '1206381988559323166';
    
    let report = [`**Debug Report for: ${characterName}**\n`];
    report.push(`Collection: ${collection}`);
    report.push(`Total URLs stored: ${imageUrls.length}`);
    report.push(`Message IDs stored: ${messageIds.length}\n`);
    
    if (imageUrls.length === 0) {
      report.push('No image URLs stored in database.');
      await interaction.editReply(report.join('\n'));
      return;
    }
    
    report.push('**URL Analysis:**');
    const validUrls = [];
    const validMessageIds = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
      
      // Check for common issues
      const issues = [];
      
      // Check if URL is from the correct channel
      const channelMatch = url.match(/attachments\/(\d+)\//);
      const urlChannelId = channelMatch ? channelMatch[1] : null;
      const isCorrectChannel = urlChannelId === imageChannelId;
      
      if (!isCorrectChannel) {
        issues.push(`WRONG CHANNEL (${urlChannelId?.slice(-6) || 'unknown'})`);
      }
      
      if (url.includes('&=&')) issues.push('proxy URL');
      if (url.endsWith('&')) issues.push('trailing &');
      
      // Actually test the URL
      const check = await checkUrl(url);
      const status = check.valid ? '✅' : `❌ ${check.reason}`;
      
      if (check.valid && isCorrectChannel) {
        validUrls.push(url);
        if (messageIds[i]) validMessageIds.push(messageIds[i]);
      }
      
      report.push(`\n${i + 1}. ${status}`);
      report.push(`   \`${shortUrl}\``);
      if (issues.length > 0) {
        report.push(`   ⚠️ ${issues.join(', ')}`);
      }
    }
    
    const brokenCount = imageUrls.length - validUrls.length;
    report.push(`\n**Summary:** ${validUrls.length} valid, ${brokenCount} broken`);
    
    if (removeBroken && brokenCount > 0) {
      await db.collection(collection).updateOne(
        { _id: character._id },
        { 
          $set: { 
            imageUrls: validUrls,
            imageMessageIds: validMessageIds,
            updatedAt: new Date()
          } 
        }
      );
      report.push(`\n✅ **Removed ${brokenCount} broken URL(s) from database.**`);
      report.push(`User can now re-upload those images with /edit or the edit button.`);
    } else if (brokenCount > 0) {
      report.push(`\n💡 Run with \`removebroken: True\` to clean up broken URLs.`);
    }
    
    // Split into multiple messages if needed
    const fullReport = report.join('\n');
    if (fullReport.length > 1900) {
      await interaction.editReply(fullReport.substring(0, 1900) + '...');
    } else {
      await interaction.editReply(fullReport);
    }
  },
};
