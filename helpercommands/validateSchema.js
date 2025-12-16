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
 * Validates data against a schema
 * @param {string} contentType - Type of content (character, importantCharacter, beast, lore)
 * @param {object} data - Data to validate
 * @returns {object} { isValid: boolean, missingFields: string[] }
 */
module.exports.validateData = (contentType, data) => {
  const schema = schemas[contentType];

  if (!schema) {
    return {
      isValid: false,
      missingFields: [`Unknown content type: ${contentType}`],
    };
  }

  const missingFields = schema.required.filter((field) => !data[field] || data[field] === '');

  return {
    isValid: missingFields.length === 0,
    missingFields,
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
