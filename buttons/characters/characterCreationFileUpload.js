/**
 * Handles file upload button - shows modal with Discord's native File Upload component (type 19)
 * Uses raw API payload since discord.js doesn't have Label/FileUpload builders yet
 */

module.exports = async (interaction, _client) => {
  // Create modal with native file upload component using raw API structure
  const modalPayload = {
    custom_id: 'characterFileUploadModal',
    title: 'Upload Character Data',
    components: [
      {
        type: 18, // Label
        label: 'Character Data File',
        description: 'Upload JSON, TXT, PDF, or DOCX (required: name, age, appearance, powers, backstory)',
        component: {
          type: 19, // File Upload
          custom_id: 'character_file',
          required: true,
          min_values: 1,
          max_values: 1,
        },
      },
    ],
  };

  // Send raw API response since builders don't support these components yet
  await interaction.client.rest.post(
    `/interactions/${interaction.id}/${interaction.token}/callback`,
    {
      body: {
        type: 9, // MODAL
        data: modalPayload,
      },
    },
  );
};
