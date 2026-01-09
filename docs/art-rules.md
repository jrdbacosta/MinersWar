# Art Rules and Structure

This document explains the artwork and metadata folder conventions for MinersWar.

Folders
- `assets/images/` — Exported final images (PNG/JPEG/SVG) used in token metadata and front-end.
- `assets/sources/` — Working design files (PSD, AI, SVG source layers). Use Git LFS for these.
- `assets/thumbnails/` — Small preview images for admin panels.
- `metadata/templates/` — JSON templates for metadata fields.
- `metadata/generated/` — Generated token metadata JSON files ready for IPFS pinning.
- `ipfs/pinned/` — Optional mapping of token id -> CID after pinning.

Naming
- Use zero-padded numeric filenames: `0001.png`, `0001.json`.
- Keep one-to-one mapping between image and metadata filenames.

Version control
- Do NOT commit large source files to normal git. Use Git LFS or external storage.
- Keep exported final images in `assets/images/` (these are small and okay in repo up to reasonable size).

Metadata schema
- See `metadata/templates/schema.json` for required fields.

Pinning
- Use `scripts/pin-to-ipfs.js` to pin images and metadata; the script will write a mapping to `ipfs/pinned/pins.json`.

License
- Include license info in `docs/art-license.md` if artworks have special licensing.
