const schemas = {
  character: {
    required: ['name', 'appearance', 'backstory'],
    optional: [
      'title',
      'age',
      'gender',
      'birthplace',
      'eyecolor',
      'haircolor',
      'height',
      'species',
      'armor',
      'beliefs',
      'powers',
      'abilities',
      'talents',
      'hobbies',
      'likes',
      'dislikes',
      'weapons',
      'habitat',
      'significance',
      'info',
    ],
  },
  importantCharacter: {
    required: ['name', 'appearance', 'backstory'],
    optional: [
      'title',
      'age',
      'gender',
      'birthplace',
      'eyecolor',
      'haircolor',
      'height',
      'species',
      'armor',
      'beliefs',
      'powers',
      'abilities',
      'talents',
      'hobbies',
      'likes',
      'dislikes',
      'weapons',
      'habitat',
      'significance',
      'info',
    ],
  },
  beast: {
    required: ['name'],
    optional: [
      'appearance',
      'abilities',
      'powers',
      'habitat',
      'significance',
      'info',
    ],
  },
  lore: {
    required: ['name'],
    optional: [
      'info',
      'content',
    ],
  },
  location: {
    required: ['name'],
    optional: [
      'continent',
      'region',
      'province',
      'territory',
      'population',
      'government',
      'defense',
      'commerce',
      'organizations',
      'description',
      'crime',
      'geography',
      'laws',
      'climate',
      'history',
      'culture',
      'notable',
      'factions',
    ],
  },
};

module.exports.schemas = schemas;

module.exports.validateSchema = (contentType, data) => {
  const schema = schemas[contentType];
  if (!schema) {
    return { valid: false, errors: [`Unknown content type: ${contentType}`] };
  }

  const errors = [];

  for (const field of schema.required) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
};

// Strip markdown formatting from text (especially for names/headers from docx)
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
    .replace(/\*([^*]+)\*/g, '$1')       // *italic*
    .replace(/__([^_]+)__/g, '$1')       // __underline__
    .replace(/_([^_]+)_/g, '$1')         // _italic_
    .replace(/~~([^~]+)~~/g, '$1')       // ~~strikethrough~~
    .replace(/`([^`]+)`/g, '$1')         // `code`
    .replace(/\|\|([^|]+)\|\|/g, '$1')   // ||spoiler||
    .replace(/^[_*~`|]+|[_*~`|]+$/g, '') // Strip leading/trailing markdown chars
    .trim();
}

module.exports.stripMarkdown = stripMarkdown;

module.exports.normalizeData = (contentType, fileData) => {
  const schema = schemas[contentType];
  const allowedFields = new Set([
    ...(schema?.required || []),
    ...(schema?.optional || []),
    'imageUrls',
    'content',
  ]);

  const normalized = {};
  for (const [k, v] of Object.entries(fileData || {})) {
    if (allowedFields.has(k)) normalized[k] = v;
  }

  // Strip markdown from name field (especially from docx imports)
  if (normalized.name) {
    normalized.name = stripMarkdown(normalized.name);
  }

  // Convert string arrays to actual arrays where needed
  if (contentType === 'character' || contentType === 'importantCharacter') {
    if (typeof normalized.imageUrls === 'string') {
      normalized.imageUrls = normalized.imageUrls
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return normalized;
};

/**
 * Compatibility wrapper for validateData (used by buttons/modals)
 */
module.exports.validateData = (contentType, data) => {
  const result = module.exports.validateSchema(contentType, data);
  return {
    isValid: result.valid,
    missingFields: result.errors.map(e => e.replace('Missing required field: ', '')),
    warnings: [],
  };
};