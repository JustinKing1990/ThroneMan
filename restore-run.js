const { restoreCollection } = require('./helpercommands/restoreFromArchive');

async function main() {
  await restoreCollection('characterArchive', 'characters');
  await restoreCollection('importantCharacterArchive', 'importantCharacters');
  await restoreCollection('loreArchive', 'lore');
}

main().catch((e) => {
  console.error('Restore failed:', e);
  process.exit(1);
});
