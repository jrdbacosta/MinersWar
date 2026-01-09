import hre from "hardhat";
import { ethers } from "ethers";

async function deployContract(name, signer) {
  const artifact = await hre.artifacts.readArtifact(name);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  if (contract.waitForDeployment) await contract.waitForDeployment();
  else if (contract.deployed) await contract.deployed();
  else if (contract.deployTransaction) await contract.deployTransaction.wait();
  return contract;
}

async function main() {
  const rpc = process.env.RPC_URL || (hre.network && hre.network.config && hre.network.config.url) || '';
  if (!rpc) throw new Error('RPC URL not set (set RPC_URL env)');
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('Private key not set (set DEPLOYER_PRIVATE_KEY env)');

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('Deployer address:', signer.address);

  const myNft = await deployContract('MyNFT', signer);
  console.log('MyNFT deployed to:', myNft.target || myNft.address || (await myNft.getAddress && await myNft.getAddress()));

  // set a default royalty of 5% (500 / 10000) to the deployer
  const nft = new ethers.Contract(myNft.target || myNft.address || (await myNft.getAddress && await myNft.getAddress()), (await hre.artifacts.readArtifact('MyNFT')).abi, signer);
  const tx = await nft.setDefaultRoyalty(signer.address, 500);
  await tx.wait();
  console.log('Default royalty set to 5% for', signer.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
