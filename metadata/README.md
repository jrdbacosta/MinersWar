# Metadata automation

This folder contains tools and templates to generate NFT metadata JSON files from the image assets and (optionally) pinned IPFS CIDs.

Quick commands:

Generate metadata using the clean template and any existing pins:

```bash
node ./scripts/generate-metadata-automate.js --template ./metadata/templates/schema.clean.json
```

Pin files using local `ipfs` CLI and produce `ipfs/pinned/pins.json`:

```bash
node ./scripts/pin-to-ipfs-cli.js --dir ./assets/images --out ./ipfs/pinned/pins.json
```

Notes:
- The generator will look for `assets/images` by default.
- If a `pins.json` file exists it expects a mapping of `filename -> cid` (e.g. `{"0001.png":"Qm..."}`) and will use `ipfs://<cid>` as the `image` field.
- You can provide an attributes mapping at `metadata/attributes.json` where keys are filenames (or basenames) and values are arrays of trait objects.

Single-image workflow:

 - Add an info JSON describing the artwork to `metadata/sources/` (example: `metadata/sources/Aria.json`). This file should include `name`, optional `description`, and a `traits` object.
 - Run the single-image generator to produce one metadata JSON for a given image:

```bash
node ./scripts/create-single-metadata.js --info ./metadata/sources/Aria.json --image 1.png --out ./metadata/generated
```

Pack configuration:

 - Edit `metadata/pack-ratios.txt` to change pack chances in human-readable form.
 - `metadata/pack-config.json` contains a machine-readable version of pack definitions for automation.
