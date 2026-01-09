#!/usr/bin/env bash
# Sync artwork from an external folder into repo `assets/` folders.
# Usage: ./scripts/sync-artwork.sh "/path/to/source" [--commit]

set -euo pipefail

SRC=${1:-"/Volumes/Dock/Miners War/All Media/NFT"}
COMMIT=${2:-}

if [ -z "$SRC" ]; then
  echo "Usage: $0 \"/path/to/source\" [--commit]"
  exit 1
fi

DEST_IMG="$(pwd)/assets/images"
DEST_SRC="$(pwd)/assets/sources"
mkdir -p "$DEST_IMG" "$DEST_SRC"

echo "Syncing images from $SRC to $DEST_IMG"
rsync -av --prune-empty-dirs --include '*/' \
  --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.svg' --include='*.gif' --include='*.webp' \
  --exclude='*' "$SRC/" "$DEST_IMG/"

echo "Syncing source files from $SRC to $DEST_SRC"
rsync -av --prune-empty-dirs --include '*/' \
  --include='*.psd' --include='*.ai' --include='*.xcf' --include='*.svg' \
  --exclude='*' "$SRC/" "$DEST_SRC/"

if [ "$COMMIT" = "--commit" ]; then
  git add assets && git add .gitattributes || true
  git commit -m "chore(nft): sync artwork from $SRC" || true
  git push || true
fi

echo "Done."
