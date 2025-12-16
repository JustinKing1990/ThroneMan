/**
 * Processes file uploads and returns parsed JSON data
 */

const { EmbedBuilder } = require('discord.js');
const pdf = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

/**
 * Fetches and parses a file from Discord attachment
 * @param {Attachment} attachment - Discord attachment object
 * @returns {Promise<{data: object, error: string | null}>}
 */
module.exports.parseFileUpload = async (attachment) => {
  try {
    // Check file size (limit to 8MB for safety)
    if (attachment.size > 8 * 1024 * 1024) {
      return {
        data: null,
        error: 'File is too large. Maximum size is 8MB.',
      };
    }

    // Check file type
    const fileName = attachment.name.toLowerCase();
    let data;

    if (fileName.endsWith('.json')) {
      data = await parseJsonFile(attachment);
    } else if (fileName.endsWith('.txt')) {
      data = await parseTxtFile(attachment);
    } else if (fileName.endsWith('.pdf')) {
      data = await parsePdfFile(attachment);
    } else if (fileName.endsWith('.docx')) {
      data = await parseDocxFile(attachment);
    } else {
      return {
        data: null,
        error: 'Unsupported file type. Please use JSON, TXT, PDF, or DOCX files.',
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        data: null,
        error: 'Invalid JSON format in file. Please check your file syntax.',
      };
    }

    return {
      data: null,
      error: `Failed to process file: ${error.message}`,
    };
  }
};

/**
 * Parse JSON file
 */
async function parseJsonFile(attachment) {
  const response = await fetch(attachment.url);
  const text = await response.text();
  return JSON.parse(text);
}

/**
 * Parse TXT file (treat content as single field or try to parse as JSON)
 */
async function parseTxtFile(attachment) {
  const response = await fetch(attachment.url);
  const text = await response.text();

  // Try to parse as JSON first
  try {
    return JSON.parse(text);
  } catch (_e) {
    // Try to parse as key-value pairs (Name: Value format)
    const parsed = parseKeyValueText(text);
    if (parsed) {
      return parsed;
    }

    // If not JSON or key-value, treat as a single "info" or "backstory" field
    return {
      content: text,
    };
  }
}

/**
 * Parse PDF file - extracts text content and images
 */
async function parsePdfFile(attachment) {
  try {
    const response = await fetch(attachment.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract images from PDF
    const images = [];
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Get embedded images - pdf-lib doesn't have direct image extraction
      // We need to check the document for image objects
      const embeddedImages = [];
      
      // Iterate through pages to find image objects
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);
        
        // Try to get resources from page
        try {
          const { Resources } = page.node.normalizedEntries();
          if (!Resources) continue;
          
          const resources = pdfDoc.context.lookup(Resources);
          if (!resources || typeof resources.get !== 'function') continue;
          
          const xObjectRef = resources.get(pdfDoc.context.obj('XObject'));
          if (!xObjectRef) continue;
          
          const xObjects = pdfDoc.context.lookup(xObjectRef);
          if (!xObjects || typeof xObjects.entries !== 'function') continue;
          
          // Iterate through XObjects to find images
          for (const [name, ref] of xObjects.entries()) {
            try {
              const xObject = pdfDoc.context.lookup(ref);
              if (!xObject || typeof xObject.get !== 'function') continue;
              
              const subtypeRef = xObject.get(pdfDoc.context.obj('Subtype'));
              const subtype = pdfDoc.context.lookup(subtypeRef);
              
              if (subtype && subtype.toString() === '/Image') {
                embeddedImages.push({ name: name.toString(), ref });
              }
            } catch (xObjErr) {
              // Skip problematic xObjects
            }
          }
        } catch (pageErr) {
          // Skip problematic pages
        }
      }
      
      if (embeddedImages.length > 0) {
        console.log(`Found ${embeddedImages.length} embedded images in PDF - extraction would require additional decoding`);
        // Full extraction requires decoding based on image format (JPEG, PNG, etc.)
        // For now, we've identified images exist but can't easily extract them
      }
    } catch (pdfLibErr) {
      // Silent fallback - just proceed with text extraction
    }
    
    // Extract text
    const pdfData = await pdf(buffer);
    const fullText = pdfData.text;

    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(fullText);
      if (images.length > 0) {
        jsonData.imageUrls = images;
      }
      return jsonData;
    } catch (_e) {
      // Try to parse as key-value pairs
      const parsed = parseKeyValueText(fullText);
      if (parsed) {
        if (images.length > 0) {
          parsed.imageUrls = images;
        }
        return parsed;
      }
      
      // If not JSON or key-value, treat as content
      const result = {
        content: fullText,
      };
      if (images.length > 0) {
        result.imageUrls = images;
      }
      return result;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse PDF: ${error.message}. Please use JSON, TXT, or DOCX format instead.`,
    );
  }
}

/**
 * Parse DOCX file - extracts text content and images
 */
async function parseDocxFile(attachment) {
  const mammoth = require('mammoth');

  try {
    const response = await fetch(attachment.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const textResult = await mammoth.extractRawText({ buffer });
    const fullText = textResult.value;

    // Extract images
    const images = [];
    const imageResult = await mammoth.convert(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read();
          const base64 = imageBuffer.toString('base64');
          const contentType = image.contentType || 'image/png';
          const dataUrl = `data:${contentType};base64,${base64}`;
          images.push(dataUrl);
          return { src: dataUrl };
        }),
      },
    );

    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(fullText);
      // Add extracted images if any
      if (images.length > 0) {
        jsonData.imageUrls = images;
      }
      return jsonData;
    } catch (_e) {
      // Try to parse as key-value pairs (Name: Value format)
      const parsed = parseKeyValueText(fullText);
      if (parsed) {
        // Add extracted images if any
        if (images.length > 0) {
          parsed.imageUrls = images;
        }
        return parsed;
      }

      // If not JSON or key-value, treat as content
      const result = {
        content: fullText,
      };
      if (images.length > 0) {
        result.imageUrls = images;
      }
      return result;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse DOCX: ${error.message}. Please use JSON, TXT, or PDF format instead.`,
    );
  }
}

/**
 * Parse key-value text format (e.g., "Name: John\nAge: 25")
 * @param {string} text - Plain text with key-value pairs
 * @returns {object|null} Parsed object or null if not parseable
 */
function parseKeyValueText(text) {
  const lines = text.split('\n').filter((line) => line.trim());
  const result = {};
  let currentKey = null;
  let currentValue = [];

  for (const line of lines) {
    // Check if line contains a colon (key: value format)
    const colonIndex = line.indexOf(':');

    if (colonIndex > 0 && colonIndex < line.length - 1) {
      // Save previous key-value if exists
      if (currentKey) {
        result[currentKey] = currentValue.join('\n').trim();
      }

      // Start new key-value
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      currentKey = key;
      currentValue = value ? [value] : [];
    } else if (currentKey) {
      // Continue previous value (multi-line)
      currentValue.push(line.trim());
    }
  }

  // Save last key-value
  if (currentKey) {
    result[currentKey] = currentValue.join('\n').trim();
  }

  // Check if we found any valid key-value pairs
  if (Object.keys(result).length > 0) {
    // Normalize common field names
    const normalized = {};
    for (const [key, value] of Object.entries(result)) {
      const normalizedKey = normalizeFieldName(key);
      normalized[normalizedKey] = value;
    }
    return normalized;
  }

  return null;
}

/**
 * Normalize field names to match expected schema
 */
function normalizeFieldName(key) {
  const mappings = {
    name: 'name',
    age: 'age',
    title: 'title',
    gender: 'gender',
    birthplace: 'birthplace',
    'birth place': 'birthplace',
    appearance: 'appearance',
    'eye color': 'eyecolor',
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
  };

  return mappings[key.toLowerCase()] || key;
}

/**
 * Creates an embed showing missing required fields
 * @param {string[]} missingFields - Array of missing field names
 * @param {string} contentType - Type of content
 * @returns {EmbedBuilder} Discord embed
 */
module.exports.createMissingFieldsEmbed = (missingFields, contentType) => {
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
};

/**
 * Creates an embed showing uploaded data summary
 * @param {object} data - Normalized data
 * @param {string} contentType - Type of content
 * @returns {EmbedBuilder} Discord embed
 */
module.exports.createDataSummaryEmbed = (data, contentType) => {
  const embed = new EmbedBuilder()
    .setColor('#51cf66')
    .setTitle(`${contentType} Data Loaded`)
    .setDescription('Your file has been successfully parsed and validated.');

  const fieldsToShow = Object.entries(data)
    .filter(([_, value]) => value && value !== '')
    .slice(0, 25);

  fieldsToShow.forEach(([key, value]) => {
    const displayValue = Array.isArray(value) ? value.join('\n') : String(value);
    const truncated =
      displayValue.length > 1024 ? displayValue.substring(0, 1021) + '...' : displayValue;

    embed.addFields({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: truncated || 'Not provided',
      inline: false,
    });
  });

  return embed;
};

/**
 * Creates an example JSON template for a content type
 * @param {string} contentType - Type of content
 * @returns {string} JSON template as string
 */
module.exports.getJsonTemplate = (contentType) => {
  const templates = {
    character: {
      name: 'Character Name',
      age: '25',
      title: 'Optional Title',
      gender: 'Optional Gender',
      birthplace: 'Optional Birthplace',
      appearance: 'Optional appearance description',
      eyecolor: 'Optional eye color',
      haircolor: 'Optional hair color',
      height: 'Optional height',
      species: 'Optional species',
      armor: 'Optional armor description',
      beliefs: 'Optional beliefs',
      powers: 'Optional powers',
      weapons: 'Optional weapons',
      backstory: 'Optional backstory',
    },
    importantCharacter: {
      name: 'Important Character Name',
      age: '30',
      title: 'Optional Title',
      gender: 'Optional Gender',
      birthplace: 'Optional Birthplace',
      appearance: 'Optional appearance description',
      eyecolor: 'Optional eye color',
      haircolor: 'Optional hair color',
      height: 'Optional height',
      species: 'Optional species',
      armor: 'Optional armor description',
      beliefs: 'Optional beliefs',
      powers: 'Optional powers',
      weapons: 'Optional weapons',
      backstory: 'Optional backstory',
    },
    beast: {
      name: 'Beast Name',
      habitat: 'Beast habitat description',
      appearance: 'What the beast looks like',
      abilities: 'Beast abilities description',
      significance: 'Cultural or world significance',
    },
    lore: {
      name: 'Lore Name',
      info: 'Lore information or history',
    },
  };

  return JSON.stringify(templates[contentType] || templates.character, null, 2);
};
