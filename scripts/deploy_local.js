#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readArtifact(contractName) {
  const p = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const content = await fs.readFile(p, 'utf8');
  return JSON.parse(content);
}

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  // Use separate Hardhat accounts for deployments to avoid nonce conflicts
  const pk0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const pk1 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const pk2 = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
  const signer0 = new ethers.Wallet(pk0, provider);
  const signer1 = new ethers.Wallet(pk1, provider);
  const signer2 = new ethers.Wallet(pk2, provider);

  const myNftArt = await readArtifact('MyNFT');
  const counterArt = await readArtifact('Counter');
  const packArt = await readArtifact('PackSale');

  const MyNFTFactory = new ethers.ContractFactory(myNftArt.abi, myNftArt.bytecode, signer0);
  const CounterFactory = new ethers.ContractFactory(counterArt.abi, counterArt.bytecode, signer1);
  const PackFactory = new ethers.ContractFactory(packArt.abi, packArt.bytecode, signer2);

  console.log('Deploying MyNFT...');
  const myNft = await MyNFTFactory.deploy();
  await myNft.waitForDeployment();
  console.log('MyNFT deployed to:', await myNft.getAddress());

  console.log('Deploying Counter...');
  const counter = await CounterFactory.deploy();
  await counter.waitForDeployment();
  console.log('Counter deployed to:', await counter.getAddress());

  const price = ethers.parseEther('0.01');
  const itemsPerPack = 10;
  console.log('Deploying PackSale...');
  const packSale = await PackFactory.deploy(await myNft.getAddress(), price, itemsPerPack);
  await packSale.waitForDeployment();
  console.log('PackSale deployed to:', await packSale.getAddress());

  console.log('Granting minter role to PackSale...');
  const tx = await myNft.connect(signer0).setMinter(await packSale.getAddress(), true);
  await tx.wait();
  console.log('Granted minter');

  // write frontend .env
  const envPath = path.join(__dirname, '..', 'frontend', '.env');
  const env = `REACT_APP_PACKSALE_ADDRESS=${await packSale.getAddress()}\nREACT_APP_CONTRACT_ADDRESS=${await myNft.getAddress()}\n`;
  await fs.writeFile(envPath, env, 'utf8');
  console.log('Wrote', envPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
