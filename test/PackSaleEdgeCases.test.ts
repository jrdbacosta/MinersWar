import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("PackSale edge cases", function () {
  it("reverts when ERC20 allowance is insufficient", async function () {
    const [deployer, buyer] = await ethers.getSigners();

    const mock = await ethers.deployContract("MockERC20", ["MockUSD", "MUSD"]);
    await mock.waitForDeployment?.();

    const myNft = await ethers.deployContract("MyNFT");
    const price = ethers.parseEther("0.01");
    const itemsPerPack = 2;
    const packSale = await ethers.deployContract("PackSale", [await myNft.getAddress(), price, itemsPerPack]);
    await packSale.waitForDeployment?.();

    await myNft.setMinter(await packSale.getAddress(), true);
    await packSale.connect(deployer).setPaymentToken(await mock.getAddress());

    // mint tokens to buyer but do NOT approve
    await mock.mint(await buyer.getAddress(), ethers.parseEther("1"));

    // Expect buyPack to revert due to transferFrom failing (insufficient allowance)
    let didRevert = false;
    try {
      await packSale.connect(buyer).buyPack(1);
    } catch (err) {
      didRevert = true;
    }
    expect(didRevert).to.be.true;
  });

  it("reverts if native value is sent while payment token is ERC20", async function () {
    const [deployer, buyer] = await ethers.getSigners();

    const mock = await ethers.deployContract("MockERC20", ["MockUSD", "MUSD"]);
    await mock.waitForDeployment?.();

    const myNft = await ethers.deployContract("MyNFT");
    const price = ethers.parseEther("0.01");
    const itemsPerPack = 2;
    const packSale = await ethers.deployContract("PackSale", [await myNft.getAddress(), price, itemsPerPack]);
    await packSale.waitForDeployment?.();

    await myNft.setMinter(await packSale.getAddress(), true);
    await packSale.connect(deployer).setPaymentToken(await mock.getAddress());

    // mint and approve
    await mock.mint(await buyer.getAddress(), ethers.parseEther("1"));
    await mock.connect(buyer).approve(await packSale.getAddress(), price);

    // Attempt to send native value when ERC20 is set — should revert with "do not send native"
    await expect(packSale.connect(buyer).buyPack(1, { value: price })).to.be.revertedWith("do not send native");
  });

  it("only owner can withdraw ERC20 and native funds", async function () {
    const [deployer, buyer, other] = await ethers.getSigners();

    // Test ERC20 withdraw permission
    const mock = await ethers.deployContract("MockERC20", ["MockUSD", "MUSD"]);
    await mock.waitForDeployment?.();

    const myNft = await ethers.deployContract("MyNFT");
    const price = ethers.parseEther("0.01");
    const itemsPerPack = 2;
    const packSale = await ethers.deployContract("PackSale", [await myNft.getAddress(), price, itemsPerPack]);
    await packSale.waitForDeployment?.();

    let didRevert = false;

    await myNft.setMinter(await packSale.getAddress(), true);
    await packSale.connect(deployer).setPaymentToken(await mock.getAddress());

    // buyer buys with ERC20
    await mock.mint(await buyer.getAddress(), ethers.parseEther("1"));
    await mock.connect(buyer).approve(await packSale.getAddress(), price);
    await packSale.connect(buyer).buyPack(1);

    // non-owner withdrawERC20 should revert
    didRevert = false;
    try {
      await packSale.connect(other).withdrawERC20(await mock.getAddress(), await other.getAddress());
    } catch (err) {
      didRevert = true;
    }
    expect(didRevert).to.be.true;

    // owner can withdrawERC20
    didRevert = false;
    try {
      await packSale.connect(deployer).withdrawERC20(await mock.getAddress(), await deployer.getAddress());
    } catch (err) {
      didRevert = true;
    }
    expect(didRevert).to.be.false;

    // Test native withdraw permission
    // switch to native payments
    await packSale.connect(deployer).setPaymentToken("0x0000000000000000000000000000000000000000");

    // buyer buys sending native value
    await packSale.connect(buyer).buyPack(1, { value: price });

    // non-owner withdraw should revert
    didRevert = false;
    try {
      await packSale.connect(other).withdraw(await other.getAddress());
    } catch (err) {
      didRevert = true;
    }
    expect(didRevert).to.be.true;

    // owner withdraw to an address should succeed
    didRevert = false;
    try {
      await packSale.connect(deployer).withdraw(await deployer.getAddress());
    } catch (err) {
      didRevert = true;
    }
    expect(didRevert).to.be.false;
  });
});
