/**
 * Generate a description of an image using a local Ollama model (LLaVA)
 * @param {string} imageUrl - The URL or base64 data URL of the image
 * @param {string} context - Additional context (e.g., "character", "beast", "location")
 * @returns {Promise<string>} - The generated description
 */
async function generateImageDescription(imageUrl, context = 'character') {
  const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';

  try {
    // Extract base64 data from data URL if needed
    let base64Image = imageUrl;
    if (imageUrl.startsWith('data:')) {
      base64Image = imageUrl.split(',')[1];
    }

    // Create a contextual prompt based on what we're describing
    const prompts = {
      character:
        "Describe this character's physical appearance in detail. Focus only on their visible features, clothing, accessories, hair, body type, and distinctive characteristics. Do not mention that this is an image or artwork. Be direct and vivid (2-4 sentences).",
      beast:
        "Describe this creature's physical appearance in detail. Focus only on its size, body structure, coloring, notable features, and unique characteristics. Do not mention that this is an image. Be direct and vivid (2-4 sentences).",
      important:
        "Describe this important character's physical appearance in detail. Focus only on their visible features, clothing, accessories, hair, body type, and distinctive characteristics. Do not mention that this is an image. Be direct and vivid (2-4 sentences).",
    };

    const prompt = prompts[context] || prompts.character;

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          num_predict: 200, // Limit output length
          top_k: 40,
          top_p: 0.9,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    let description = data.response?.trim();

    if (!description) {
      return null;
    }

    // Clean up meta-commentary about the image/artwork
    description = description
      // Remove phrases like "The image shows", "This image depicts", etc.
      .replace(
        /^(the\s+)?(image|artwork|picture|photo|illustration|drawing|painting|depiction)\s+(shows|depicts|displays|demonstrates|reveals)[:\s]*/i,
        '',
      )
      // Remove "depicted in the image" or similar mid-sentence
      .replace(
        /\s+(depicted|shown|visible|seen)\s+(in\s+the\s+)?(image|artwork|picture|photo)[,\s]*/gi,
        ', ',
      )
      // Remove leading article + image adjective combinations
      .replace(
        /^(this\s+)?(is\s+)?(an?\s+)?(digital\s+)?(artwork|image|painting|illustration|drawing|picture)[:\s]*/i,
        '',
      )
      .trim();

    // Capitalize first letter if lowercase
    if (description && description[0] === description[0].toLowerCase()) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    return description || null;
  } catch (error) {
    // Check if Ollama is running
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      console.warn('⚠️  Ollama is not running.');
      console.warn(
        '   To enable auto-image descriptions, install Ollama from https://ollama.ai and run: ollama pull llava',
      );
      console.warn('   Then restart this bot.');
    } else if (error.message?.includes('Ollama API error')) {
      console.warn('⚠️  Ollama error:', error.message);
      console.warn('   Make sure the LLaVA model is installed: ollama pull llava');
    } else {
      console.error('Error generating image description:', error.message);
    }
    return null;
  }
}

module.exports = { generateImageDescription };
