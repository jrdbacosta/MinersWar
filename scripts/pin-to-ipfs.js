const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

// This script assumes `ipfs` CLI is installed and `ipfs add --pin` is available.
// Alternatively, replace with an HTTP pinning service API calls (Pinata/Infura).

const dir = path.join(__dirname, '..', 'assets', 'images');
const out = path.join(__dirname, '..', 'ipfs', 'pinned', 'pins.json');
if (!fs.existsSync(path.dirname(out))) fs.mkdirSync(path.dirname(out), { recursive: true });

const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|svg)$/i.test(f)).sort();
const pins = {};

files.forEach(file => {
  const full = path.join(dir, file);
  console.log('Pinning', file);
  const outp = execSync(`ipfs add --pin -Q "${full}"`).toString().trim();
  pins[file] = outp;
});

fs.writeFileSync(out, JSON.stringify(pins, null, 2));
console.log('Wrote pins to', out);
