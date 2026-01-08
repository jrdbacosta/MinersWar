// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MyNFT.sol";

contract PackSale is Ownable {
    MyNFT public nft;
    uint256 public price;
    uint256 public itemsPerPack;
    IERC20 public paymentToken; // if zero address, accept native coin

    mapping(address => uint256) public packs;

    event PackPurchased(address indexed buyer, uint256 amount);
    event PackOpened(address indexed opener, uint256[] tokenIds);

    constructor(address _nft, uint256 _price, uint256 _itemsPerPack) Ownable(msg.sender) {
        require(_nft != address(0), "invalid nft");
        require(_itemsPerPack > 0, "itemsPerPack=0");
        nft = MyNFT(_nft);
        price = _price;
        itemsPerPack = _itemsPerPack;
    }

    // Buy `amount` packs by sending exact ETH value or approved ERC20
    function buyPack(uint256 amount) external payable {
        require(amount > 0, "amount=0");
        uint256 total = price * amount;
        if (address(paymentToken) == address(0)) {
            require(msg.value == total, "wrong value");
        } else {
            require(msg.value == 0, "do not send native");
            bool ok = paymentToken.transferFrom(msg.sender, address(this), total);
            require(ok, "token transfer failed");
        }
        packs[msg.sender] += amount;
        emit PackPurchased(msg.sender, amount);
    }

    // Open packs by providing a list of URIs equal to itemsPerPack * numberOfPacks
    function openPackWithURIs(string[] calldata uris) external {
        uint256 total = uris.length;
        require(total > 0, "no uris");
        require(total % itemsPerPack == 0, "invalid uris count");
        uint256 packsToOpen = total / itemsPerPack;
        require(packs[msg.sender] >= packsToOpen, "not enough packs");
        packs[msg.sender] -= packsToOpen;

        uint256[] memory minted = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            uint256 id = nft.mintTo(msg.sender, uris[i]);
            minted[i] = id;
        }

        emit PackOpened(msg.sender, minted);
    }

    function withdraw(address payable to) external onlyOwner {
        require(to != address(0), "invalid address");
        to.transfer(address(this).balance);
    }

    // Withdraw ERC20 tokens collected by the contract
    function withdrawERC20(address token, address to) external onlyOwner {
        require(to != address(0), "invalid address");
        IERC20 t = IERC20(token);
        uint256 bal = t.balanceOf(address(this));
        require(t.transfer(to, bal), "transfer failed");
    }

    // Owner can set a payment token (ERC20). Set to address(0) to accept native coin.
    function setPaymentToken(address token) external onlyOwner {
        paymentToken = IERC20(token);
    }

    function setPrice(uint256 p) external onlyOwner { price = p; }
    function setItemsPerPack(uint256 n) external onlyOwner { require(n > 0); itemsPerPack = n; }
}
