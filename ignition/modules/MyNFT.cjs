const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MyNFTModule", (m) => {
  // This tells Ignition to deploy the "MyNFT" contract
  const nft = m.contract("MyNFT");

  return { nft };
});


