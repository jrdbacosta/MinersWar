# Deploying to Polygon Amoy (testnet)

This file explains how to deploy the contracts in this repo to Polygon Amoy and how to get test funds.

1) Create a `.env` file in the repository root with these variables:

```env
# RPC endpoint for Polygon Amoy (Alchemy, Infura, or other provider)
POLYGON_AMOY_RPC_URL=https://polygon-amoy.example-rpc
# Private key of deployer account (DO NOT commit this)
POLYGON_AMOY_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# (optional) Sepolia variables are supported for L1 tests
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
```

2) Install dependencies and build (from repo root):

```bash
npm install
npx hardhat compile
```

3) Deploy to Polygon Amoy:

```bash
npx hardhat run scripts/deploy.js --network polygonAmoy
```

4) Getting test MATIC and RPC providers:
- Use Alchemy or Infura to create an Amoy endpoint and copy the RPC URL into `POLYGON_AMOY_RPC_URL`.
- If an official Amoy faucet exists, use it to request test MATIC; otherwise use the provider/testnet faucets recommended in Polygon docs: https://polygon.technology/docs/

5) Verify contracts (after deployment):
- You can verify contracts using `npx hardhat verify --network polygonAmoy <DEPLOYED_ADDRESS> "Constructor args"` depending on explorer support.

Notes:
- Never commit private keys. Keep them in environment variables or a secrets manager.
- If you prefer Sepolia for L1 parity testing, set `SEPOLIA_RPC_URL` and use `--network sepolia`.
