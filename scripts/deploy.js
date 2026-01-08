// Deploy script using Hardhat artifacts + ethers.js signer (avoids hre.ethers dependency)
import hre from "hardhat";
import { ethers } from "ethers";

function getRpcUrl() {
  return process.env.ZKSYNC_ERA_RPC_URL || (hre.network && hre.network.config && hre.network.config.url) || '';
}

async function deployContract(name, signer) {
  const artifact = await hre.artifacts.readArtifact(name);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  // wait for deployment transaction
  if (contract.waitForDeployment) await contract.waitForDeployment();
  else if (contract.deployed) await contract.deployed();
  else if (contract.deployTransaction) await contract.deployTransaction.wait();
  return contract;
}

async function main() {
  const rpc = getRpcUrl();
  if (!rpc) throw new Error('RPC URL not set (ZKSYNC_ERA_RPC_URL)');
  if (!process.env.ZKSYNC_ERA_PRIVATE_KEY) throw new Error('Private key not set (ZKSYNC_ERA_PRIVATE_KEY)');

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(process.env.ZKSYNC_ERA_PRIVATE_KEY, provider);

  console.log('Deployer address:', signer.address);

  const myNft = await deployContract('MyNFT', signer);
  console.log('MyNFT deployed to:', myNft.target || myNft.address || (await myNft.getAddress && await myNft.getAddress()));

  const counter = await deployContract('Counter', signer);
  console.log('Counter deployed to:', counter.target || counter.address || (await counter.getAddress && await counter.getAddress()));

  const price = ethers.parseEther('0.01');
  const itemsPerPack = 10;

  // PackSale constructor: (nftAddress, price, itemsPerPack)
  const PackSaleArtifact = await hre.artifacts.readArtifact('PackSale');
  const PackSaleFactory = new ethers.ContractFactory(PackSaleArtifact.abi, PackSaleArtifact.bytecode, signer);
  const packSale = await PackSaleFactory.deploy(myNft.target || myNft.address || (await myNft.getAddress && await myNft.getAddress()), price, itemsPerPack);
  if (packSale.waitForDeployment) await packSale.waitForDeployment();
  else if (packSale.deployed) await packSale.deployed();
  else if (packSale.deployTransaction) await packSale.deployTransaction.wait();
  console.log('PackSale deployed to:', packSale.target || packSale.address || (await packSale.getAddress && await packSale.getAddress()));

  // grant minter role to PackSale
  const nftContract = new ethers.Contract(myNft.target || myNft.address || (await myNft.getAddress && await myNft.getAddress()), (await hre.artifacts.readArtifact('MyNFT')).abi, signer);
  const tx = await nftContract.setMinter(packSale.target || packSale.address || (await packSale.getAddress && await packSale.getAddress()), true);
  await tx.wait();
  console.log('Granted minter role to PackSale');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
