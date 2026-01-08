#!/usr/bin/env bash
# Usage: ./scripts/set_frontend_env.sh <PACKSALE_ADDRESS> [NFT_CONTRACT_ADDRESS]
if [ -z "$1" ]; then
  echo "Usage: $0 <PACKSALE_ADDRESS> [NFT_CONTRACT_ADDRESS]"
  exit 1
fi
PACK=$1
NFT=${2:-$1}
FRONTEND_DIR="frontend"
ENV_FILE="$FRONTEND_DIR/.env"
cat > "$ENV_FILE" <<EOF
REACT_APP_PACKSALE_ADDRESS=$PACK
REACT_APP_CONTRACT_ADDRESS=$NFT
EOF
echo "Wrote $ENV_FILE"
