const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', 'assets', 'images');
const outDir = path.join(__dirname, '..', 'metadata', 'generated');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg|svg)$/i.test(f)).sort();

files.forEach((file, idx) => {
  const id = String(idx + 1).padStart(4, '0');
  const metadata = {
    name: `MinersWar #${id}`,
    description: `On-chain collectible from MinersWar.`,
    image: `ipfs://<CID>/${id}.png`,
    attributes: []
  };
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(metadata, null, 2));
});

console.log(`Generated ${files.length} metadata files to ${outDir}`);
