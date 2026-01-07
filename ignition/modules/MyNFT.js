import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyNFTModule", (m) => {
  // We use the full path to resolve the conflict
  const nft = m.contract("contracts/MyNFT.sol:MyNFT"); 

  return { nft };
});

