#!/usr/bin/env node
import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(){
  const env = await fs.readFile(path.join(__dirname,'..','frontend','.env'),'utf8');
  const lines = env.split(/\n/).filter(Boolean);
  const vars = Object.fromEntries(lines.map(l=>l.split('=')));
  const PACK = vars.REACT_APP_PACKSALE_ADDRESS;
  const NFT = vars.REACT_APP_CONTRACT_ADDRESS;
  console.log('Using PackSale', PACK, 'NFT', NFT);

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  // use account 1 as buyer
  const buyerPk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const buyer = new ethers.Wallet(buyerPk, provider);

  const abi = [
    'function price() view returns (uint256)',
    'function itemsPerPack() view returns (uint256)',
    'function buyPack(uint256 amount) payable',
    'function openPackWithURIs(string[] calldata uris)'
  ];

  const pack = new ethers.Contract(PACK, abi, buyer);

  const price = await pack.price();
  const items = await pack.itemsPerPack();
  console.log('price', price.toString(),'itemsPerPack',items.toString());

  // buy 1 pack
  const buyTx = await pack.buyPack(1n, { value: price });
  console.log('buy tx hash', buyTx.hash);
  await buyTx.wait();
  console.log('Bought 1 pack');

  // prepare URIs
  const uris = [];
  for(let i=0;i<Number(items);i++) uris.push(`ipfs://fake-${Date.now()}-${i}`);
  console.log('URIs:',uris);

  // ensure correct nonce for automining local node
  const nextNonce = await provider.getTransactionCount(buyer.address);
  const openTx = await pack.openPackWithURIs(uris, { nonce: BigInt(nextNonce) });
  console.log('open tx hash', openTx.hash);
  await openTx.wait();
  console.log('Opened pack');

  // check minted NFTs owners
  const nftAbi = ['function nextTokenId() view returns (uint256)','function ownerOf(uint256) view returns (address)','function tokenURI(uint256) view returns (string)'];
  const nft = new ethers.Contract(NFT, nftAbi, provider);
  const next = Number(await nft.nextTokenId());
  console.log('nextTokenId',next);
  for(let i=0;i<next;i++){
    try{
      const owner = await nft.ownerOf(i);
      if(owner.toLowerCase()===buyer.address.toLowerCase()){
        const uri = await nft.tokenURI(i);
        console.log('owned token',i,uri);
      }
    }catch(e){ }
  }
}

main().catch(e=>{console.error(e); process.exit(1)});
