// Simple deploy script for Hardhat + Ethers v6
import hre from "hardhat";

async function main() {
  const { ethers } = hre;

  const myNft = await ethers.deployContract("MyNFT");
  console.log("MyNFT deployed to:", await myNft.getAddress());

  const counter = await ethers.deployContract("Counter");
  console.log("Counter deployed to:", await counter.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
