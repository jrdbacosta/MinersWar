require("@nomicfoundation/hardhat-toolbox"); // Modern replacement for Waffle

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28", // Use a modern Solidity version
  networks: {
    sepolia: {
      url: "YOUR_ALCHEMY_OR_INFURA_SEPOLIA_URL",
      accounts: ["0xYOUR_PRIVATE_KEY"] 
    }
  }
};

