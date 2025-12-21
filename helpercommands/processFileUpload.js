const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const { normalizeData, validateSchema } = require('./validateSchema');

function cleanKey(rawKey) {
  return rawKey
    .replace(/[*_`~]/g, '') // strip markdown emphasis characters
    .replace(/^[^A-Za-z0-9]+/, '') // trim leading punctuation
    .replace(/[^A-Za-z0-9]+$/, '') // trim trailing punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Your schema field mappings (add synonyms here if needed)
const FIELD_MAPPINGS = {
  name: 'name',
  // Location/place name synonyms (these map to the name field)
  location: 'name',
  city: 'name',
  town: 'name',
  village: 'name',
  kingdom: 'name',
  nation: 'name',
  country: 'name',
  realm: 'name',
  place: 'name',
  
  // Continent/region as their own fields
  continent: 'continent',
  region: 'region',
  province: 'province',
  territory: 'territory',
  
  age: 'age',
  title: 'title',
  gender: 'gender',
  birthplace: 'birthplace',
  'birth place': 'birthplace',

  appearance: 'appearance',

  'eye color': 'eyecolor',
  'eye-colour': 'eyecolor',
  eyecolor: 'eyecolor',

  'hair color': 'haircolor',
  haircolor: 'haircolor',

  height: 'height',
  species: 'species',
  armor: 'armor',
  beliefs: 'beliefs',
  powers: 'powers',
  abilities: 'abilities',
  talents: 'talents',
  hobbies: 'hobbies',
  likes: 'likes',
  dislikes: 'dislikes',
  weapons: 'weapons',

  backstory: 'backstory',
  'back story': 'backstory',

  habitat: 'habitat',
  significance: 'significance',
  info: 'info',

  // Location fields
  population: 'population',
  government: 'government',
  defense: 'defense',
  commerce: 'commerce',
  organizations: 'organizations',
  description: 'description',
  crime: 'crime',
  geography: 'geography',
  laws: 'laws',
  climate: 'climate',
  history: 'history',
  culture: 'culture',
  notable: 'notable',
  'notable locations': 'notable',
  'notable places': 'notable',
  factions: 'factions',
};

function getKnownSchemaKeys() {
  const s = new Set();
  for (const k of Object.keys(FIELD_MAPPINGS)) s.add(cleanKey(k));
  for (const v of Object.values(FIELD_MAPPINGS)) s.add(cleanKey(v));
  return s;
}

function getAllowedNormalizedSchemaKeys() {
  return new Set(Object.values(FIELD_MAPPINGS).map((v) => cleanKey(v)));
}

function normalizeFieldName(key) {
  return FIELD_MAPPINGS[key.toLowerCase()] || key;
}

function extractHeadedSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  const knownKeys = getKnownSchemaKeys();

  // Fields that can be detected without a colon (e.g., "Backstory" on its own line)
  const flexibleFields = new Set([
    'backstory', 'back story', 'appearance', 'abilities', 'powers', 'significance', 'info',
    // Location fields
    'population', 'government', 'defense', 'commerce', 'organizations', 'description',
    'crime', 'geography', 'laws', 'climate', 'history', 'culture', 'notable', 'factions'
  ]);

  const parseHeading = (line) => {
    let trimmedLine = line.trim();
    
    // Strip leading list markers (-, *, •, numbers) and whitespace
    trimmedLine = trimmedLine.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
    
    const colonIndex = trimmedLine.indexOf(':');
    
    // Check for traditional "Key: Value" format
    if (colonIndex >= 1) {
      const rawKey = trimmedLine.substring(0, colonIndex);
      const key = cleanKey(rawKey);
      const value = trimmedLine.substring(colonIndex + 1).trim();

      if (!key) return null;
      if (!knownKeys.has(key)) return null;

      return { key, value };
    }
    
    // Check for flexible fields without colon (e.g., "Backstory" at start of line)
    const cleanedLine = cleanKey(trimmedLine);
    if (flexibleFields.has(cleanedLine) && knownKeys.has(cleanedLine)) {
      // Line is just the field name (e.g., "Backstory" or "**Backstory**")
      return { key: cleanedLine, value: '' };
    }
    
    // Check if line starts with a flexible field name followed by content
    // e.g., "Backstory My character was born..."
    for (const field of flexibleFields) {
      const fieldPattern = new RegExp(`^[\\*_\`~]*${field}[\\*_\`~]*\\s+(.+)$`, 'i');
      const match = trimmedLine.match(fieldPattern);
      if (match && knownKeys.has(field)) {
        return { key: field, value: match[1].trim() };
      }
    }

    return null;
  };

  let currentKey = null;

  for (const line of lines) {
    const heading = parseHeading(line);
    if (heading) {
      currentKey = heading.key;
      if (!sections[currentKey]) sections[currentKey] = [];
      if (heading.value) sections[currentKey].push(heading.value);
      continue;
    }

    if (currentKey) {
      sections[currentKey].push(line);
    }
  }

  const out = {};
  for (const [k, arr] of Object.entries(sections)) {
    out[k] = arr.join('\n').trim();
  }
  return out;
}

function isLikelyKeyValue(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;

  const knownKeys = getKnownSchemaKeys();

  let kvCount = 0;
  let knownKeyHits = 0;

  for (const line of lines.slice(0, 50)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && colonIndex < line.length - 1) {
      const key = cleanKey(line.substring(0, colonIndex));
      if (key.length > 0 && key.length <= 50) {
        kvCount += 1;
        if (knownKeys.has(key)) knownKeyHits += 1;
      }
    }
  }

  // Heuristic: at least 2 recognized schema keys early in the doc
  if (knownKeyHits >= 2) return true;

  // Or lots of key/value lines with at least one recognized key
  if (kvCount >= 6 && knownKeyHits >= 1) return true;

  return false;
}

/**
 * IMPORTANT FIX:
 * Only treat "Key: Value" as a NEW field if "Key" is a known schema field.
 * Otherwise, treat the line as part of the current field's body.
 * Also handles flexible fields like "Backstory" without colons.
 */
function parseKeyValueText(text) {
  const lines = text.split('\n').filter((line) => line.trim());
  const result = {};
  let currentKey = null;
  let currentValue = [];

  const knownSchemaKeys = getKnownSchemaKeys();
  const allowedNormalized = getAllowedNormalizedSchemaKeys();
  
  // Fields that can be detected without a colon
  const flexibleFields = new Set([
    'backstory', 'back story', 'appearance', 'abilities', 'powers', 'significance', 'info',
    // Location fields
    'population', 'government', 'defense', 'commerce', 'organizations', 'description',
    'crime', 'geography', 'laws', 'climate', 'history', 'culture', 'notable', 'factions'
  ]);

  for (const line of lines) {
    let trimmedLine = line.trim();
    
    // Strip leading list markers (-, *, •, numbers) and whitespace
    const strippedLine = trimmedLine.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
    
    const colonIndex = strippedLine.indexOf(':');

    let matchedKey = null;
    let matchedValue = null;

    // Check for traditional "Key: Value" format
    if (colonIndex > 0 && colonIndex < strippedLine.length - 1) {
      const potentialKey = cleanKey(strippedLine.substring(0, colonIndex));
      const normalizedKey = normalizeFieldName(potentialKey);

      const isKnownKey =
        knownSchemaKeys.has(potentialKey) &&
        allowedNormalized.has(cleanKey(normalizedKey));

      if (isKnownKey) {
        matchedKey = potentialKey;
        matchedValue = strippedLine.substring(colonIndex + 1).trim();
      }
    }
    
    // If no colon match, check for flexible fields
    if (!matchedKey) {
      const cleanedLine = cleanKey(strippedLine);
      
      // Check if line is just the field name
      if (flexibleFields.has(cleanedLine) && knownSchemaKeys.has(cleanedLine)) {
        matchedKey = cleanedLine;
        matchedValue = '';
      } else {
        // Check if line starts with a flexible field name followed by content
        for (const field of flexibleFields) {
          const fieldPattern = new RegExp(`^[\\*_\`~]*${field}[\\*_\`~]*\\s+(.+)$`, 'i');
          const match = trimmedLine.match(fieldPattern);
          if (match && knownSchemaKeys.has(field)) {
            matchedKey = field;
            matchedValue = match[1].trim();
            break;
          }
        }
      }
    }

    if (matchedKey) {
      // flush previous
      if (currentKey) {
        result[currentKey] = currentValue.join('\n').trim();
      }

      currentKey = matchedKey;
      currentValue = matchedValue ? [matchedValue] : [];
    } else if (currentKey) {
      // Not a known schema key: keep it inside current field
      currentValue.push(trimmedLine);
    }
  }

  if (currentKey) {
    result[currentKey] = currentValue.join('\n').trim();
  }

  // Normalize keys through mapping
  const normalized = {};
  for (const [k, v] of Object.entries(result)) {
    const normKey = normalizeFieldName(k);
    normalized[normKey] = v;
  }

  return normalized;
}

async function parseDocxFile(filePath) {
  // Use convertToMarkdown to preserve bold/italic/underline formatting
  const result = await mammoth.convertToMarkdown({ path: filePath });
  let text = (result.value || '').replace(/\u00A0/g, ' ');
  
  // Extract images from markdown output (mammoth embeds them as ![](data:image/...;base64,...))
  const extractedImages = [];
  const imageRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
  let match;
  
  while ((match = imageRegex.exec(text)) !== null) {
    extractedImages.push(match[1]);
  }
  
  // Remove the image markdown from text (we'll handle images separately)
  text = text.replace(imageRegex, '').trim();
  
  return { text, images: extractedImages };
}

async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text || '';
}

function extractTextFromTxt(filePath) {
  // Normalize Windows line endings later in the pipeline.
  return fs.readFileSync(filePath, 'utf8');
}

async function processUploadedFile(filePath, contentType) {
  const ext = path.extname(filePath).toLowerCase();
  let fullText = '';
  let extractedImages = [];

  if (ext === '.docx') {
    const docxResult = await parseDocxFile(filePath);
    fullText = docxResult.text;
    extractedImages = docxResult.images || [];
  } else if (ext === '.pdf') {
    const buf = fs.readFileSync(filePath);
    fullText = await extractTextFromPdf(buf);
  } else if (ext === '.txt') {
    fullText = extractTextFromTxt(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Allowed: .docx, .pdf, .txt`);
  }

  fullText = (fullText || '').replace(/\r\n/g, '\n').trim();

  let extractedData = {};

  if (isLikelyKeyValue(fullText)) {
    extractedData = parseKeyValueText(fullText);
  } else {
    extractedData = extractHeadedSections(fullText);
    if (!Object.keys(extractedData).length) {
      extractedData = { content: fullText };
    }
  }

  // Add extracted images to the data if any were found
  if (extractedImages.length > 0) {
    // Merge with any existing imageUrls from the text
    const existingImages = extractedData.imageUrls || [];
    const existingArray = Array.isArray(existingImages) ? existingImages : 
      (typeof existingImages === 'string' ? existingImages.split(',').map(s => s.trim()).filter(Boolean) : []);
    extractedData.imageUrls = [...existingArray, ...extractedImages];
  }

  const normalized = normalizeData(contentType, extractedData);
  const { valid, errors } = validateSchema(contentType, normalized);

  return {
    rawText: fullText,
    parsed: extractedData,
    normalized,
    valid,
    errors,
    extractedImages, // Also return separately for reference
  };
}

/**
 * Parse file upload from Discord attachment (compatibility wrapper)
 * @param {Attachment} attachment - Discord attachment object
 * @param {string} contentType - The content type for validation (e.g., 'character', 'beast', 'location', 'lore')
 * @returns {Promise<{data: object, error: string | null}>}
 */
async function parseFileUpload(attachment, contentType = 'character') {
  try {
    // Check file size (limit to 8MB for safety)
    if (attachment.size > 8 * 1024 * 1024) {
      return {
        data: null,
        error: 'File is too large. Maximum size is 8MB.',
      };
    }

    // Download file to temp location
    const response = await fetch(attachment.url);
    const buffer = await response.arrayBuffer();
    const tempPath = path.join(require('os').tmpdir(), attachment.name);
    fs.writeFileSync(tempPath, Buffer.from(buffer));

    try {
      // Use the underlying processor with the specified content type
      const result = await processUploadedFile(tempPath, contentType);
      
      // Clean up temp file
      fs.unlinkSync(tempPath);

      // If validation failed but we have images and only missing appearance,
      // return data anyway so the modal can try auto-generating appearance
      if (!result.valid) {
        const onlyMissingAppearance = result.errors.length === 1 && 
          result.errors[0].includes('appearance');
        const hasImages = result.normalized.imageUrls && result.normalized.imageUrls.length > 0;
        
        if (onlyMissingAppearance && hasImages) {
          // Allow modal to try auto-generating appearance
          return {
            data: result.normalized,
            error: null,
            needsAppearanceGeneration: true,
          };
        }
        
        return {
          data: null,
          error: `Validation failed: ${result.errors.join(', ')}`,
        };
      }

      return {
        data: result.normalized,
        error: null,
      };
    } catch (err) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw err;
    }
  } catch (error) {
    return {
      data: null,
      error: `Failed to process file: ${error.message}`,
    };
  }
}

/**
 * Creates an embed showing missing required fields
 */
function createMissingFieldsEmbed(missingFields, contentType) {
  const { EmbedBuilder } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor('#ff6b6b')
    .setTitle(`Missing Required Fields - ${contentType}`)
    .setDescription('Your file is missing the following required fields:')
    .addFields({
      name: 'Missing Fields',
      value: missingFields.map((field) => `• \`${field}\``).join('\n'),
      inline: false,
    });
  return embed;
}

/**
 * Creates multiple embeds showing uploaded data with proper formatting
 * Handles Discord's embed limits (6000 chars total, 1024 per field, 25 fields max)
 * Preserves markdown formatting in values
 */
function createDataSummaryEmbeds(data, contentType) {
  const { EmbedBuilder } = require('discord.js');
  const embeds = [];
  const skipKeys = new Set(['userId', 'updatedAt', 'createdAt', 'messageIds']);
  
  // Define field display order and nice names
  const fieldOrder = [
    'name', 'title', 'gender', 'age', 'birthplace', 'height', 'species',
    'eyecolor', 'haircolor', 'appearance', 'weapons', 'armor', 'beliefs',
    'powers', 'abilities', 'backstory', 'habitat', 'significance', 'info'
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
    abilities: 'Abilities',
    backstory: 'Backstory',
    habitat: 'Habitat',
    significance: 'Significance',
    info: 'Info',
    imageUrls: 'Images'
  };

  let currentEmbed = new EmbedBuilder()
    .setColor('#51cf66')
    .setTitle(`${contentType} Data Loaded`);
  
  let currentEmbedSize = contentType.length + 50; // title + overhead
  let fieldCount = 0;
  let isFirstEmbed = true;

  const addFieldToEmbed = (name, value, inline = false) => {
    const fieldSize = name.length + value.length + 50; // extra overhead for JSON structure
    
    // Check if we need a new embed (4000 to be safe, max 25 fields)
    if (currentEmbedSize + fieldSize > 4000 || fieldCount >= 20) {
      embeds.push(currentEmbed);
      currentEmbed = new EmbedBuilder()
        .setColor('#51cf66')
        .setTitle(`${contentType} (continued)`);
      currentEmbedSize = contentType.length + 60;
      fieldCount = 0;
      isFirstEmbed = false;
    }
    
    currentEmbed.addFields({ name, value, inline });
    currentEmbedSize += fieldSize;
    fieldCount++;
  };

  // Process fields in order
  for (const key of fieldOrder) {
    if (!data[key] || data[key] === '' || skipKeys.has(key)) continue;
    
    const displayName = niceNames[key] || key;
    const rawValue = Array.isArray(data[key]) ? data[key].join('\n') : String(data[key]);
    
    // Short fields can be inline
    const isShortField = ['name', 'title', 'gender', 'age', 'birthplace', 'height', 'species', 'eyecolor', 'haircolor'].includes(key);
    
    if (rawValue.length <= 1024) {
      addFieldToEmbed(displayName, rawValue, isShortField && rawValue.length < 100);
    } else {
      // Split long content into multiple fields
      const chunks = [];
      let remaining = rawValue;
      let partNum = 1;
      
      while (remaining.length > 0) {
        // Try to split at a paragraph or sentence boundary
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
        
        chunks.push(remaining.substring(0, splitPoint).trim());
        remaining = remaining.substring(splitPoint).trim();
        partNum++;
      }
      
      for (let i = 0; i < chunks.length; i++) {
        const partLabel = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
        addFieldToEmbed(`${displayName}${partLabel}`, chunks[i], false);
      }
    }
  }

  // Handle imageUrls specially
  if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
    addFieldToEmbed('Images', `${data.imageUrls.length} image(s) attached`, true);
  }

  // Add any remaining fields not in our order
  for (const [key, value] of Object.entries(data)) {
    if (fieldOrder.includes(key) || skipKeys.has(key) || key === 'imageUrls' || !value || value === '') continue;
    
    const displayValue = Array.isArray(value) ? value.join('\n') : String(value);
    if (displayValue.length <= 1024) {
      addFieldToEmbed(key, displayValue, false);
    }
  }

  // Push the last embed
  if (fieldCount > 0) {
    embeds.push(currentEmbed);
  }

  // If no embeds created, make a simple one
  if (embeds.length === 0) {
    embeds.push(new EmbedBuilder()
      .setColor('#51cf66')
      .setTitle(`${contentType} Data Loaded`)
      .setDescription('Your file has been parsed but no displayable fields were found.'));
  }

  return embeds;
}

/**
 * Single embed version for backward compatibility
 */
function createDataSummaryEmbed(data, contentType) {
  const embeds = createDataSummaryEmbeds(data, contentType);
  return embeds[0];
}

/**
 * Formats full data as text with proper field labels (preserves markdown)
 */
function formatFullDataAsText(data) {
  const lines = [];
  const skipKeys = new Set(['userId', 'updatedAt', 'createdAt', 'messageIds']);
  
  for (const [key, value] of Object.entries(data)) {
    if (skipKeys.has(key) || !value || value === '') continue;
    
    if (key === 'imageUrls') {
      if (Array.isArray(value) && value.length > 0) {
        lines.push(`**${key}**: ${value.length} image(s) attached`);
      }
      continue;
    }
    
    const displayValue = Array.isArray(value) ? value.join('\n') : String(value);
    lines.push(`**${key}**: ${displayValue}`);
    lines.push(''); // blank line between fields
  }
  
  return lines.join('\n');
}

/**
 * Convert base64 image URLs to Discord AttachmentBuilder objects for preview display
 * @param {Array<string>} imageUrls - Array of base64 data URLs
 * @returns {{attachments: Array<AttachmentBuilder>, filenames: Array<string>}} - Attachments and their filenames
 */
function createImageAttachments(imageUrls) {
  const { AttachmentBuilder } = require('discord.js');
  const attachments = [];
  const filenames = [];
  
  if (!imageUrls || imageUrls.length === 0) return { attachments, filenames };
  
  for (let i = 0; i < imageUrls.length; i++) {
    const dataUrl = imageUrls[i];
    if (dataUrl.startsWith('data:')) {
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const extension = mimeType.split('/')[1] || 'png';
        const filename = `preview_${i + 1}.${extension}`;
        const attachment = new AttachmentBuilder(buffer, { name: filename });
        attachments.push(attachment);
        filenames.push(filename);
      }
    }
  }
  
  return { attachments, filenames };
}

module.exports = {
  processUploadedFile,
  parseFileUpload,
  extractHeadedSections,
  parseKeyValueText,
  isLikelyKeyValue,
  normalizeFieldName,
  cleanKey,
  createMissingFieldsEmbed,
  createDataSummaryEmbed,
  createDataSummaryEmbeds,
  formatFullDataAsText,
  createImageAttachments,
};
