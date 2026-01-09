// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract MyNFT is ERC721, ERC2981, Ownable {
    uint256 public nextTokenId;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => bool) private _minters;

    constructor() ERC721("MyNFT", "NFT") Ownable(msg.sender) {}

    function mint(string memory _tokenURI) external onlyOwner {
        _safeMint(msg.sender, nextTokenId);
        _tokenURIs[nextTokenId] = _tokenURI;
        nextTokenId++;
    }

    function mintTo(address to, string memory _tokenURI) external returns (uint256) {
        require(_minters[msg.sender] || owner() == msg.sender, "Not authorized to mint");
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = _tokenURI;
        nextTokenId++;
        return tokenId;
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        _minters[account] = allowed;
    }

    function isMinter(address account) external view returns (bool) {
        return _minters[account];
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) external onlyOwner {
        _requireOwned(tokenId);
        _tokenURIs[tokenId] = _tokenURI;
    }

    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        delete _tokenURIs[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // --- ERC2981 royalty helpers ---
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function resetTokenRoyalty(uint256 tokenId) external onlyOwner {
        _resetTokenRoyalty(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

