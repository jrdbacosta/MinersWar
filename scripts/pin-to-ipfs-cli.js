#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs');

const argv = yargs
  .option('dir', { type: 'string', default: path.join(__dirname, '..', 'assets', 'images'), describe: 'Directory with files to pin' })
  .option('out', { type: 'string', default: path.join(__dirname, '..', 'ipfs', 'pinned', 'pins.json'), describe: 'Output pins JSON (filename->cid)' })
  .option('command', { type: 'string', default: 'ipfs add --pin -Q', describe: 'Command to add single file (use %s for filename if needed)' })
  .help()
  .argv;

const dir = argv.dir;
const out = argv.out;
const cmdTemplate = argv.command;

if (!fs.existsSync(dir)) { console.error('Directory not found:', dir); process.exit(1); }
if (!fs.existsSync(path.dirname(out))) fs.mkdirSync(path.dirname(out), { recursive: true });

const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|svg|gif)$/i.test(f)).sort();
const pins = {};

files.forEach(file => {
  const full = path.join(dir, file);
  try {
    const cmd = cmdTemplate.includes('%s') ? cmdTemplate.replace('%s', `"${full}"`) : `${cmdTemplate} "${full}"`;
    console.log('Pinning', file);
    const outp = execSync(cmd, { stdio: ['pipe', 'pipe', 'inherit'] }).toString().trim();
    // ipfs add -Q returns the file CID
    pins[file] = outp;
  } catch (e) {
    console.error('Failed to pin', file, e.message || e);
  }
});

fs.writeFileSync(out, JSON.stringify(pins, null, 2));
console.log('Wrote pins to', out);
