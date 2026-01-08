#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const env = await fs.readFile(path.join(__dirname, '..', 'frontend', '.env'), 'utf8');
  const lines = env.split(/\n/).filter(Boolean);
  const vars = Object.fromEntries(lines.map(l => l.split('=')));
  const PACK = vars.REACT_APP_PACKSALE_ADDRESS;
  if (!PACK) throw new Error('PACKSALE_ADDRESS not found in frontend/.env');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  // owner used when deploying pack in deploy_local.js: account #2
  const ownerPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
  const owner = new ethers.Wallet(ownerPk, provider);

  const abi = ['function setItemsPerPack(uint256 n) external', 'function itemsPerPack() view returns (uint256)'];
  const pack = new ethers.Contract(PACK, abi, owner);

  const newVal = 10;
  console.log('Setting itemsPerPack to', newVal, 'on', PACK);
  const tx = await pack.setItemsPerPack(newVal);
  console.log('tx', tx.hash);
  await tx.wait();
  const val = await pack.itemsPerPack();
  console.log('itemsPerPack is now', val.toString());
}

main().catch(e => { console.error(e); process.exit(1); });
