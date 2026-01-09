#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

const argv = yargs
  .option('config', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'pack-config.json'), describe: 'Pack config JSON' })
  .option('imagesRoot', { type: 'string', default: path.join(__dirname, '..', 'assets', 'images', 'NFT'), describe: 'Root images folder' })
  .option('out', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated', 'packs'), describe: 'Output directory for generated pack JSONs' })
  .option('csv', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated', 'packs.csv'), describe: 'CSV output path' })
  .option('perPack', { type: 'number', default: 10, describe: 'Number of items per pack (overrides config.itemsPerPack if set)' })
  .option('count', { type: 'number', default: 5, describe: 'Number of packs to generate per pack type' })
  .option('seed', { type: 'string', default: 'bulk-seed', describe: 'Base seed for deterministic generation' })
  .help()
  .argv;

const configPath = argv.config;
const imagesRoot = argv.imagesRoot;
const outDir = argv.out;
const csvPath = argv.csv;
const perPackOverride = argv.perPack;
const count = argv.count;
const seedBase = argv.seed;

if (!fs.existsSync(configPath)) { console.error('Pack config not found:', configPath); process.exit(1); }
if (!fs.existsSync(imagesRoot)) { console.error('Images root not found:', imagesRoot); process.exit(1); }
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const config = JSON.parse(fs.readFileSync(configPath));

function scanImages(root) {
  const items = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(png|jpg|jpeg|svg|gif)$/i.test(e.name)) {
        const parts = full.split(path.sep);
        const rarities = ['Common','Uncommon','Rare','Epic','Legendary'];
        let rarity = 'Unknown';
        for (const r of rarities) if (parts.includes(r)) { rarity = r; break; }
        items.push({ filename: e.name, path: full, rarity });
      }
    }
  }
  walk(root);
  return items;
}

const allItems = scanImages(imagesRoot);
if (allItems.length === 0) { console.error('No image files found under', imagesRoot); process.exit(1); }
const byRarity = {};
for (const it of allItems) { if (!byRarity[it.rarity]) byRarity[it.rarity]=[]; byRarity[it.rarity].push(it); }

function makeRng(seedStr) {
  if (!seedStr) return Math.random;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); h = h >>> 0; }
  let t = h + 0x6D2B79F5 >>> 0;
  return function() { t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0; t ^= t + Math.imul(t ^ (t >>> 7), t | 61) >>> 0; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function sampleWithoutReplacement(pool, count, rng) {
  const copy = pool.slice();
  const out = [];
  while (out.length < count && copy.length>0) {
    const idx = Math.floor(rng()*copy.length);
    out.push(copy.splice(idx,1)[0]);
  }
  return out;
}

function generateOnePack(packDef, seedStr) {
  const rng = makeRng(seedStr);
  const items = [];
  const itemsPerPack = perPackOverride || packDef.itemsPerPack || 10;

  if (Array.isArray(packDef.guaranteed)) {
    for (const g of packDef.guaranteed) {
      const pool = byRarity[g.rarity] || [];
      const take = Math.min(g.count || 1, pool.length);
      const chosen = sampleWithoutReplacement(pool, take, rng);
      items.push(...chosen);
    }
  }

  let remaining = itemsPerPack - items.length; if (remaining<0) remaining=0;
  const dist = packDef.distribution || {}; const rarities = Object.keys(dist); const weights = rarities.map(r=>dist[r]||0);

  const picked = items.slice(); const used = new Set(picked.map(i=>i.path));
  const availableByRarity = {};
  for (const r of rarities) availableByRarity[r] = (byRarity[r]||[]).filter(i=>!used.has(i.path));

  for (let i=0;i<remaining;i++) {
    const currentWeights = rarities.map((r,idx)=> availableByRarity[r].length>0 ? weights[idx] : 0);
    const totalW = currentWeights.reduce((a,b)=>a+b,0);
    if (totalW === 0) {
      const anyPool = [];
      for (const r of rarities) anyPool.push(...availableByRarity[r]);
      if (anyPool.length === 0) break;
      const chosen = sampleWithoutReplacement(anyPool,1,rng)[0];
      picked.push(chosen); used.add(chosen.path);
      if (availableByRarity[chosen.rarity]) availableByRarity[chosen.rarity]=availableByRarity[chosen.rarity].filter(x=>x.path!==chosen.path);
      continue;
    }
    let rrand = rng()*totalW; let selectedRarity = rarities[rarities.length-1];
    for (let j=0;j<rarities.length;j++) { if (rrand < currentWeights[j]) { selectedRarity = rarities[j]; break; } rrand -= currentWeights[j]; }
    const pool = availableByRarity[selectedRarity]; if (!pool || pool.length===0) { i--; continue; }
    const chosen = sampleWithoutReplacement(pool,1,rng)[0]; picked.push(chosen); used.add(chosen.path); availableByRarity[selectedRarity]=availableByRarity[selectedRarity].filter(x=>x.path!==chosen.path);
  }

  if (picked.length < itemsPerPack) { const anyLeft = allItems.filter(x=>!used.has(x.path)); const more = sampleWithoutReplacement(anyLeft, itemsPerPack - picked.length, makeRng(seedStr+'-pad')); picked.push(...more); }

  return picked.slice(0, itemsPerPack).map(it=>({ filename: it.filename, path: it.path, rarity: it.rarity }));
}

// CSV header
const csvLines = ['packId,packType,seed,items'];
let globalCounter = 1;
const packNames = Object.keys(config.packs || {});
for (const pname of packNames) {
  const packDef = config.packs[pname];
  if (!packDef) continue;
  for (let i=0;i<count;i++) {
    const seedStr = `${seedBase}-${pname}-${i+1}`;
    const contents = generateOnePack(packDef, seedStr);
    const stamp = seedBase;
    const outFile = path.join(outDir, `${pname.replace(/\s+/g,'_')}-${stamp}-${i+1}.json`);
    fs.writeFileSync(outFile, JSON.stringify({ pack: pname, generatedAt: new Date().toISOString(), items: contents, seed: seedStr }, null, 2));
    console.log('Wrote', outFile);
    const itemsField = contents.map(x=>x.filename).join(';');
    csvLines.push(`${globalCounter},${pname},${seedStr},"${itemsField}"`);
    globalCounter++;
  }
}
fs.writeFileSync(csvPath, csvLines.join('\n'));
console.log('Wrote CSV', csvPath);
