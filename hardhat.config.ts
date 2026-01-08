import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    polygonAmoy: {
      type: "http",
      // Hardhat accepts 'l1', 'op' or 'generic' for chainType — use 'generic' for Amoy
      chainType: "generic",
      url: configVariable("POLYGON_AMOY_RPC_URL"),
      accounts: [configVariable("POLYGON_AMOY_PRIVATE_KEY")],
    },
    // zk rollups (example configs) — set RPC URL and PRIVATE KEY via env
    zkSyncEra: {
      type: "http",
      chainType: "generic",
      url: configVariable("ZKSYNC_ERA_RPC_URL"),
      accounts: [configVariable("ZKSYNC_ERA_PRIVATE_KEY")],
    },
    polygonZkEvm: {
      type: "http",
      chainType: "generic",
      url: configVariable("POLYGON_ZKEVM_RPC_URL"),
      accounts: [configVariable("POLYGON_ZKEVM_PRIVATE_KEY")],
    },
  },
});
