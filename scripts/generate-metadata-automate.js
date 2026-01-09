#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

const argv = yargs
  .option('images', { type: 'string', default: path.join(__dirname, '..', 'assets', 'images'), describe: 'Images directory' })
  .option('out', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated'), describe: 'Output metadata directory' })
  .option('pins', { type: 'string', default: path.join(__dirname, '..', 'ipfs', 'pinned', 'pins.json'), describe: 'Optional pins JSON mapping filename->cid' })
  .option('template', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'templates', 'schema.json'), describe: 'Metadata template (JSON) to merge' })
  .option('attributes', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'attributes.json'), describe: 'Optional attributes mapping JSON file' })
  .help()
  .argv;

const imagesDir = argv.images;
const outDir = argv.out;
const pinsFile = argv.pins;
const templateFile = argv.template;
const attrsFile = argv.attributes;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let pins = {};
if (fs.existsSync(pinsFile)) {
  try { pins = JSON.parse(fs.readFileSync(pinsFile)); } catch (e) { console.warn('Could not parse pins file, ignoring:', pinsFile); }
}

let template = {};
if (fs.existsSync(templateFile)) {
  try { template = JSON.parse(fs.readFileSync(templateFile)); } catch (e) { console.warn('Could not parse template file, ignoring:', templateFile); }
}

let attrs = {};
if (fs.existsSync(attrsFile)) {
  try { attrs = JSON.parse(fs.readFileSync(attrsFile)); } catch (e) { console.warn('Could not parse attributes file, ignoring:', attrsFile); }
}

const files = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg|svg)$/i.test(f)).sort() : [];

files.forEach((file, idx) => {
  const base = path.parse(file).name;
  const id = String(idx + 1).padStart(4, '0');

  const metadata = Object.assign({}, template);
  metadata.name = metadata.name || `MinersWar #${id}`;
  metadata.description = metadata.description || `On-chain collectible from MinersWar.`;

  // Prefer explicit pin mapping (filename -> cid). If present, use ipfs://<cid>
  if (pins[file]) {
    metadata.image = `ipfs://${pins[file]}`;
  } else if (pins[base]) {
    metadata.image = `ipfs://${pins[base]}`;
  } else if (metadata.image && typeof metadata.image === 'string' && metadata.image.includes('<CID>')) {
    metadata.image = metadata.image.replace('<CID>', 'REPLACE_CID').replace(/0001\.png|<FILENAME>/g, file);
  } else {
    // fallback to local relative path (useful for previews)
    metadata.image = metadata.image || `assets/images/${file}`;
  }

  // Attach attributes if available
  if (attrs[file]) metadata.attributes = attrs[file];
  else if (attrs[base]) metadata.attributes = attrs[base];
  else metadata.attributes = metadata.attributes || [];

  const outPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2));
});

console.log(`Generated ${files.length} metadata files to ${outDir}`);
