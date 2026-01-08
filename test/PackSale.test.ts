import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("PackSale", function () {
  it("sells packs and opens them to mint NFTs", async function () {
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const buyer = signers[1];

    const myNft = await ethers.deployContract("MyNFT");

    const price = ethers.parseEther("0.01");
    const itemsPerPack = 2;
    const packSale = await ethers.deployContract("PackSale", [await myNft.getAddress(), price, itemsPerPack]);

    // grant minter role to packSale
    await myNft.setMinter(await packSale.getAddress(), true);

    // buyer purchases 1 pack
    await packSale.connect(buyer).buyPack(1, { value: price });
    expect(await packSale.packs(await buyer.getAddress())).to.equal(1n);

    // Open the pack by providing exactly itemsPerPack URIs
    const uris = ["ipfs://Qm1", "ipfs://Qm2"];
    await packSale.connect(buyer).openPackWithURIs(uris);

    // After opening, buyer should have 0 packs and NFTs minted
    expect(await packSale.packs(await buyer.getAddress())).to.equal(0n);
    expect(await myNft.nextTokenId()).to.equal(2n);
    expect(await myNft.ownerOf(0)).to.equal(await buyer.getAddress());
    expect(await myNft.ownerOf(1)).to.equal(await buyer.getAddress());
  });
});
