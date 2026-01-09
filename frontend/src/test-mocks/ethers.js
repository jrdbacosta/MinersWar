// Improved test mock for `ethers` used by the app during tests.
// Exports both a named `ethers` and a default export so imports like
// `import { ethers } from 'ethers'` and `import ethers from 'ethers'` work.
const mock = {
  JsonRpcProvider: class JsonRpcProvider {
    constructor() {}
  },
  BrowserProvider: class BrowserProvider {
    constructor(_arg) { this._arg = _arg; }
    async getNetwork() { return { chainId: 31337, name: 'localhost' }; }
    async getSigner() {
      return {
        getAddress: async () => '0x0000000000000000000000000000000000000001'
      };
    }
  },
  Contract: class Contract {
    constructor(address, _abi, _provider) {
      this.address = address;
      this._provider = _provider;
      this._state = { price: BigInt(1000), itemsPerPack: 1, packs: {} };
    }
    // read-only
    async price() { return this._state.price; }
    async itemsPerPack() { return this._state.itemsPerPack; }
    async packs(addr) { return this._state.packs[addr?.toLowerCase()] || 0; }
    async nextTokenId() { return 0; }
    async ownerOf(_id) { throw new Error('not found'); }
    async tokenURI(_id) { return ''; }
    // write operations return tx-like object
    async buyPack(_amount, _opts) { return { wait: async () => ({}) }; }
    async openPackWithURIs(_uris) { return { wait: async () => ({}) }; }
    // ERC20 helpers used in App (stubbed)
    async allowance() { return 0; }
    async approve() { return { wait: async () => ({}) }; }
  },
  // helper utilities commonly used
  utils: {
    parseUnits: (v) => BigInt(v),
    formatUnits: (b) => String(b)
  }
};

export const ethers = mock;
export default mock;
