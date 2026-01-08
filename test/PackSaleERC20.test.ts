import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("PackSale ERC20 flow", function () {
  it("accepts ERC20 payments and opens packs", async function () {
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const buyer = signers[1];

    // Deploy Mock ERC20 and give buyer some balance
    const mock = await ethers.deployContract("MockERC20", ["MockUSD", "MUSD"]);
    await mock.waitForDeployment?.();

    // Deploy NFT and PackSale
    const myNft = await ethers.deployContract("MyNFT");
    const price = ethers.parseEther("0.01");
    const itemsPerPack = 2;
    const packSale = await ethers.deployContract("PackSale", [await myNft.getAddress(), price, itemsPerPack]);
    await packSale.waitForDeployment?.();

    // grant minter role
    await myNft.setMinter(await packSale.getAddress(), true);

    // set ERC20 as payment token
    await packSale.connect(deployer).setPaymentToken(await mock.getAddress());

    // mint tokens to buyer and approve
    const amount = ethers.parseEther("1000");
    await mock.mint(await buyer.getAddress(), amount);
    const total = price; // buy 1 pack
    await mock.connect(buyer).approve(await packSale.getAddress(), total);

    // buyer purchases with ERC20 (no native value)
    await packSale.connect(buyer).buyPack(1);
    expect(await packSale.packs(await buyer.getAddress())).to.equal(1n);

    // open pack
    const uris = ["ipfs://A","ipfs://B"];
    await packSale.connect(buyer).openPackWithURIs(uris);

    expect(await packSale.packs(await buyer.getAddress())).to.equal(0n);
    expect(await myNft.nextTokenId()).to.equal(2n);
    expect(await myNft.ownerOf(0)).to.equal(await buyer.getAddress());
    expect(await myNft.ownerOf(1)).to.equal(await buyer.getAddress());
  });
});
