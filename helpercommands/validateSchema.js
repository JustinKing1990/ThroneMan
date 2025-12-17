/**
 * Validates data against required fields for each content type
 */

const schemas = {
  character: {
    required: ['name', 'age', 'appearance', 'powers', 'backstory'],
    optional: [
      'title',
      'gender',
      'birthplace',
      'eyecolor',
      'haircolor',
      'height',
      'species',
      'armor',
      'beliefs',
      'weapons',
      'talents',
      'hobbies',
      'likes',
      'dislikes',
    ],
  },
  importantCharacter: {
    required: ['name', 'age', 'appearance', 'powers', 'backstory'],
    optional: [
      'title',
      'gender',
      'birthplace',
      'eyecolor',
      'haircolor',
      'height',
      'species',
      'armor',
      'beliefs',
      'weapons',
      'talents',
      'hobbies',
      'likes',
      'dislikes',
    ],
  },
  beast: {
    required: ['name', 'habitat', 'appearance', 'abilities', 'significance'],
    optional: [],
  },
  lore: {
    required: ['name', 'info'],
    optional: [],
  },
};

/**
 * Validates data against a schema and checks field sizes
 * @param {string} contentType - Type of content (character, importantCharacter, beast, lore)
 * @param {object} data - Data to validate
 * @returns {object} { isValid: boolean, missingFields: string[], warnings: string[] }
 */
module.exports.validateData = (contentType, data) => {
  const schema = schemas[contentType];

  if (!schema) {
    return {
      isValid: false,
      missingFields: [`Unknown content type: ${contentType}`],
      warnings: [],
    };
  }

  const missingFields = schema.required.filter((field) => !data[field] || data[field] === '');

  // Check for oversized fields
  const warnings = [];
  const fieldSizeLimits = {
    character: {
      backstory: 5000,
      appearance: 1000,
      powers: 1000,
      beliefs: 1000,
      weapons: 1000,
      armor: 1000,
      talents: 1000,
      hobbies: 1000,
      likes: 1000,
      dislikes: 1000,
    },
    importantCharacter: {
      backstory: 5000,
      appearance: 1000,
      powers: 1000,
      beliefs: 1000,
      weapons: 1000,
      armor: 1000,
      talents: 1000,
      hobbies: 1000,
      likes: 1000,
      dislikes: 1000,
    },
    beast: {
      abilities: 3000,
      appearance: 1500,
      habitat: 1500,
      significance: 3000,
    },
    lore: {
      info: 10000,
    },
  };

  const limits = fieldSizeLimits[contentType] || {};

  for (const [field, limit] of Object.entries(limits)) {
    if (data[field]) {
      const fieldValue = Array.isArray(data[field])
        ? data[field].join('\n')
        : String(data[field]);

      if (fieldValue.length > limit) {
        warnings.push(
          `⚠️ ${field}: ${fieldValue.length} chars (soft limit: ${limit} chars - will be truncated for display)`
        );
      }
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
};

/**
 * Normalizes file data to database format
 * @param {string} contentType - Type of content
 * @param {object} fileData - Parsed file data
 * @returns {object} Normalized data
 */
module.exports.normalizeData = (contentType, fileData) => {
  const normalized = { ...fileData };

  // Convert string arrays to actual arrays where needed
  if (contentType === 'character' || contentType === 'importantCharacter') {
    if (normalized.backstory && typeof normalized.backstory === 'string') {
      normalized.backstory = [normalized.backstory];
    }
  }

  if (contentType === 'beast') {
    if (normalized.abilities && typeof normalized.abilities === 'string') {
      normalized.abilities = [normalized.abilities];
    }
    if (normalized.significance && typeof normalized.significance === 'string') {
      normalized.significance = [normalized.significance];
    }
  }

  if (contentType === 'lore') {
    if (normalized.info && typeof normalized.info === 'string') {
      normalized.info = [normalized.info];
    }
  }

  return normalized;
};

/**
 * Gets the list of required fields for a content type
 * @param {string} contentType - Type of content
 * @returns {string[]} Array of required field names
 */
module.exports.getRequiredFields = (contentType) => {
  const schema = schemas[contentType];
  return schema ? schema.required : [];
};

/**
 * Gets the list of optional fields for a content type
 * @param {string} contentType - Type of content
 * @returns {string[]} Array of optional field names
 */
module.exports.getOptionalFields = (contentType) => {
  const schema = schemas[contentType];
  return schema ? schema.optional : [];
};
