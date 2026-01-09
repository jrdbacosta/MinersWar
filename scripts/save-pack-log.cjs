#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

const argv = yargs
  .option('csv', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated', 'packs-bulk.csv') })
  .option('packsDir', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated', 'packs') })
  .option('out', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated', 'pack-log.json') })
  .help()
  .argv;

function parseCsv(csvPath) {
  const txt = fs.readFileSync(csvPath, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  lines.shift(); // header
  return lines.map(l => {
    const m = l.match(/^([^,]+),([^,]+),([^,]+),"([^"]*)"$/);
    if (!m) return null;
    return { packId: m[1], packType: m[2], seed: m[3], items: m[4].split(';').filter(Boolean) };
  }).filter(Boolean);
}

const records = parseCsv(argv.csv);
const packsDir = argv.packsDir;

const out = {
  createdAt: new Date().toISOString(),
  csv: path.resolve(argv.csv),
  packsDir: path.resolve(packsDir),
  totalPacks: records.length,
  packs: []
};

for (const r of records) {
  // try to find matching pack JSON file
  const candidates = fs.readdirSync(packsDir).filter(f => f.includes(r.packType.replace(/\s+/g,'_')) && f.includes(r.seed));
  const jsonPath = candidates.length ? path.join(packsDir, candidates[0]) : null;
  out.packs.push({ ...r, jsonPath: jsonPath ? path.resolve(jsonPath) : null, minted: false, mintedTxs: [] });
}

fs.writeFileSync(argv.out, JSON.stringify(out, null, 2));
console.log('Wrote pack log to', argv.out);
