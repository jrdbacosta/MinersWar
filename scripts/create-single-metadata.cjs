#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

const argv = yargs
  .option('info', { type: 'string', describe: 'Path to info JSON (e.g. metadata/sources/Aria.json)', demandOption: true })
  .option('image', { type: 'string', describe: 'Image filename (e.g. 1.png)', demandOption: true })
  .option('out', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated'), describe: 'Output directory' })
  .option('template', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'templates', 'schema.clean.json'), describe: 'Template JSON file' })
  .help()
  .argv;

const infoPath = path.resolve(argv.info);
const imageFile = argv.image;
const outDir = path.resolve(argv.out);
const templateFile = path.resolve(argv.template);

if (!fs.existsSync(infoPath)) { console.error('Info file not found:', infoPath); process.exit(1); }
if (!fs.existsSync(templateFile)) { console.error('Template file not found:', templateFile); process.exit(1); }
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const info = JSON.parse(fs.readFileSync(infoPath));
const template = JSON.parse(fs.readFileSync(templateFile));

// Convert provided info into OpenSea-style attributes array
function traitsToAttributes(obj) {
  const attrs = [];
  if (!obj || typeof obj !== 'object') return attrs;
  Object.entries(obj).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      attrs.push({ trait_type: k, value: v.join(', ') });
    } else if (typeof v === 'object') {
      // nested traits: flatten
      Object.entries(v).forEach(([kk, vv]) => {
        attrs.push({ trait_type: kk, value: String(vv) });
      });
    } else {
      attrs.push({ trait_type: k, value: String(v) });
    }
  });
  return attrs;
}

const base = path.parse(imageFile).name;
const id = base;

const metadata = Object.assign({}, template);
metadata.name = info.name || metadata.name || `MinersWar #${id}`;
metadata.description = info.description || metadata.description || `On-chain collectible from MinersWar.`;

// image: prefer existing pins mapping if available
const pinsPath = path.join(__dirname, '..', 'ipfs', 'pinned', 'pins.json');
let pins = {};
if (fs.existsSync(pinsPath)) {
  try { pins = JSON.parse(fs.readFileSync(pinsPath)); } catch (e) { /* ignore */ }
}
if (pins[imageFile]) metadata.image = `ipfs://${pins[imageFile]}`;
else if (pins[base]) metadata.image = `ipfs://${pins[base]}`;
else if (metadata.image && typeof metadata.image === 'string' && metadata.image.includes('<CID>')) metadata.image = metadata.image.replace('<CID>', 'REPLACE_CID').replace(/<FILENAME>|0001\.png/g, imageFile);
else metadata.image = `assets/images/${imageFile}`;

// attributes: combine template attributes and info.traits
const infoTraits = info.traits || {};
const attrs = traitsToAttributes(infoTraits);
metadata.attributes = Array.isArray(metadata.attributes) ? metadata.attributes.concat(attrs) : attrs;

// royalty: if provided in info use it
if (info.royalty && info.royalty.receiver) {
  metadata.royalty = {
    receiver: info.royalty.receiver,
    fee_percent: info.royalty.fee_percent || 0
  };
} else {
  metadata.royalty = metadata.royalty || { receiver: '0x0000000000000000000000000000000000000000', fee_percent: 0 };
}

const outPath = path.join(outDir, `${base}.json`);
fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2));
console.log('Wrote metadata to', outPath);
