#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const util = require('util');
const yargs = require('yargs');

const argv = yargs
  .option('dir', { type: 'string', default: path.join(process.cwd(), 'assets') })
  .option('out', { type: 'string', default: path.join(process.cwd(), 'metadata', 'sources') })
  .option('list', { type: 'boolean', default: false })
  .help()
  .argv;

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  return fs.readdirSync(dir).filter(f => exts.includes(path.extname(f).toLowerCase()));
}

function prompt(question, rl) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

async function main() {
  const dir = argv.dir;
  const outDir = argv.out;
  const images = listImages(dir);

  if (argv.list) {
    if (!images.length) {
      console.log('No images found in', dir);
      return;
    }
    console.log('Images in', dir);
    images.forEach((f, i) => console.log(`${i + 1}. ${f}`));
    return;
  }

  if (!images.length) {
    console.error('No images found in', dir, '\nCreate an `assets` folder or pass --dir to point to images.');
    process.exit(1);
  }

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('Select an image by number:');
  images.forEach((f, i) => console.log(`${i + 1}. ${f}`));

  let idxRaw = await prompt('Image number: ', rl);
  let idx = parseInt(idxRaw, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= images.length) {
    console.error('Invalid selection');
    rl.close();
    process.exit(1);
  }

  const filename = images[idx];
  const absPath = path.resolve(path.join(dir, filename));
  const relPath = path.relative(process.cwd(), absPath);
  const baseName = path.basename(filename, path.extname(filename));

  const defaults = {};
  defaults.name = await prompt(`Name [${baseName}]: `, rl) || baseName;
  defaults.character_type = await prompt('Character type [Human]: ', rl) || 'Human';
  defaults.clan = await prompt('Clan [Unknown]: ', rl) || 'Unknown';
  defaults.description = await prompt('Short description: ', rl) || `${defaults.name} — ${defaults.character_type} of the ${defaults.clan} clan.`;
  const royaltyReceiver = await prompt('Royalty receiver [0x000...000]: ', rl) || '0x0000000000000000000000000000000000000000';
  const royaltyFeeRaw = await prompt('Royalty fee percent [0]: ', rl) || '0';
  const royaltyFee = Number(royaltyFeeRaw) || 0;

  // traits loop
  console.log('\nEnter trait key:value pairs (empty line to finish). For array values use comma separation.');
  const attributes = [];
  while (true) {
    const pair = await prompt('trait (key:value): ', rl);
    if (!pair) break;
    const parts = pair.split(':');
    if (parts.length < 2) { console.log('Invalid, use key:value'); continue; }
    const key = parts.shift().trim();
    const valueRaw = parts.join(':').trim();
    const value = valueRaw.includes(',') ? valueRaw.split(',').map(s => s.trim()).filter(Boolean) : valueRaw;
    attributes.push({ trait_type: key, value });
  }

  const metadata = {
    name: defaults.name,
    description: defaults.description,
    image: `ipfs://REPLACE_CID/${filename}`,
    file_path: relPath,
    attributes,
    royalty: {
      receiver: royaltyReceiver,
      fee_percent: royaltyFee
    }
  };

  // ensure out dir exists
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${defaults.name.replace(/\s+/g,'_')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(metadata, null, 2));
  console.log('\nWrote metadata to', outFile);
  rl.close();
}

main().catch(err => { console.error(err); process.exit(1); });
