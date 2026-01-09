import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyNFT royalties", function () {
  it("returns default royalty info correctly", async function () {
    const [deployer, receiver] = await ethers.getSigners();

    const myNft = await ethers.deployContract("MyNFT");
    await myNft.waitForDeployment?.();

    // set default royalty to `receiver` at 5% (500 / 10000)
    await myNft.setDefaultRoyalty(await receiver.getAddress(), 500);

    // mint a token (owner mints to self)
    await myNft.mint("ipfs://token0");

    const salePrice = 10000n; // use basis points friendly number
    const [royReceiver, royaltyAmount] = await myNft.royaltyInfo(0, salePrice);

    expect(royReceiver).to.equal(await receiver.getAddress());
    expect(royaltyAmount).to.equal((salePrice * 500n) / 10000n);
  });

  it("allows per-token royalty override and reset", async function () {
    const [deployer, receiver, newReceiver] = await ethers.getSigners();

    const myNft = await ethers.deployContract("MyNFT");
    await myNft.waitForDeployment?.();

    // default royalty 2% to `receiver`
    await myNft.setDefaultRoyalty(await receiver.getAddress(), 200);

    // mint token 0 and 1
    await myNft.mint("ipfs://t0");
    await myNft.mint("ipfs://t1");

    // set token-specific royalty for token 1 to 10% to newReceiver
    await myNft.setTokenRoyalty(1, await newReceiver.getAddress(), 1000);

    const salePrice = 50000n;

    // token 0 should use default
    const [, amount0] = await myNft.royaltyInfo(0, salePrice);
    expect(amount0).to.equal((salePrice * 200n) / 10000n);

    // token 1 should use token-specific
    const [r1, amount1] = await myNft.royaltyInfo(1, salePrice);
    expect(r1).to.equal(await newReceiver.getAddress());
    expect(amount1).to.equal((salePrice * 1000n) / 10000n);

    // reset token royalty and expect default to apply again
    await myNft.resetTokenRoyalty(1);
    const [, amount1After] = await myNft.royaltyInfo(1, salePrice);
    expect(amount1After).to.equal((salePrice * 200n) / 10000n);
  });
});
