#!/usr/bin/env node
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const assetsDir = path.join(process.cwd(), 'assets');
const outDir = path.join(process.cwd(), 'metadata', 'sources');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, assetsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

function listImages() {
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  return fs.readdirSync(assetsDir).filter(f => exts.includes(path.extname(f).toLowerCase()));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  const images = listImages();
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Metadata GUI</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}label{display:block;margin-top:8px}input,select,textarea{width:100%;padding:6px}#traits{margin-top:8px}#images{display:flex;gap:8px;flex-wrap:wrap}img.thumb{width:120px;height:120px;object-fit:cover;border:1px solid #ddd;padding:4px}</style>
</head>
<body>
  <h2>Create Metadata (GUI)</h2>
  <form id="fm" enctype="multipart/form-data" method="post" action="/save">
    <label>Upload image (or choose existing)</label>
    <input type="file" name="imageFile" accept="image/*">
    <label>Or choose existing image</label>
    <select name="existingImage">
      <option value="">-- none --</option>
      ${images.map(i => `<option value="${i}">${i}</option>`).join('\n')}
    </select>

    <label>Name</label>
    <input name="name" placeholder="Name">
    <label>Character type</label>
    <input name="character_type" placeholder="Human">
    <label>Clan</label>
    <input name="clan" placeholder="Clan">
    <label>Description</label>
    <textarea name="description" rows="3"></textarea>
    <label>Royalty receiver</label>
    <input name="royaltyReceiver" placeholder="0x...">
    <label>Royalty fee percent</label>
    <input name="royaltyFee" placeholder="0">

    <div id="traits">
      <h4>Traits</h4>
      <div id="rows"></div>
      <button type="button" id="add">Add trait</button>
    </div>

    <input type="hidden" name="traitsJson" id="traitsJson">
    <button type="submit" style="margin-top:12px;padding:8px 12px">Save metadata</button>
  </form>

  <h4>Existing images</h4>
  <div id="images">
    ${images.map(i => `<div><img class="thumb" src="/assets/${i}" alt="${i}"><div style="text-align:center">${i}</div></div>`).join('')}
  </div>

<script>
  const addBtn = document.getElementById('add');
  const rows = document.getElementById('rows');
  function addRow(k='',v=''){
    const div = document.createElement('div');
    div.style.marginTop='6px';
    div.innerHTML = '<input placeholder="key" value="' + k + '" class="k"> <input placeholder="value (comma for array)" value="' + v + '" class="v"> <button type="button" class="rm">Remove</button>';
    div.querySelector('.rm').onclick = ()=>div.remove();
    rows.appendChild(div);
  }
  addBtn.onclick = ()=>addRow();
  // init one empty
  addRow();
  document.getElementById('fm').addEventListener('submit', (e)=>{
    const r = [];
    document.querySelectorAll('#rows > div').forEach(d=>{
      const k = d.querySelector('.k').value.trim();
      const v = d.querySelector('.v').value.trim();
      if (!k) return;
      const val = v.includes(',') ? v.split(',').map(s=>s.trim()).filter(Boolean) : v;
      r.push({ trait_type:k, value: val });
    });
    document.getElementById('traitsJson').value = JSON.stringify(r);
  });
</script>
</body>
</html>`);
});

app.use('/assets', express.static(assetsDir));

app.post('/save', upload.single('imageFile'), (req, res) => {
  try {
    const body = req.body || {};
    let filename = null;
    if (req.file) filename = req.file.filename;
    else if (body.existingImage) filename = body.existingImage;
    else return res.status(400).send('No image selected');

    const name = (body.name && body.name.trim()) || path.basename(filename, path.extname(filename));
    const character_type = body.character_type || 'Human';
    const clan = body.clan || 'Unknown';
    const description = body.description || `${name} — ${character_type} of the ${clan} clan.`;
    const royaltyReceiver = body.royaltyReceiver || '0x0000000000000000000000000000000000000000';
    const royaltyFee = Number(body.royaltyFee) || 0;
    const traits = body.traitsJson ? JSON.parse(body.traitsJson) : [];

    const relPath = path.relative(process.cwd(), path.join(assetsDir, filename));
    const metadata = {
      name,
      description,
      image: `ipfs://REPLACE_CID/${filename}`,
      file_path: relPath,
      attributes: traits,
      royalty: { receiver: royaltyReceiver, fee_percent: royaltyFee }
    };

    const outFile = path.join(outDir, `${name.replace(/\s+/g,'_')}.json`);
    fs.writeFileSync(outFile, JSON.stringify(metadata, null, 2));

    res.send(`<p>Wrote metadata to <strong>${outFile}</strong></p><p><a href="/">Back</a></p>`);
  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

app.listen(PORT, ()=>{
  console.log(`Metadata GUI running at http://localhost:${PORT}`);
});
