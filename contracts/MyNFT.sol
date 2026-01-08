// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; // align with project Solidity version

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => bool) private _minters;

    constructor() ERC721("MyNFT", "NFT") Ownable(msg.sender) {}

    function mint(string memory _tokenURI) external onlyOwner {
        _safeMint(msg.sender, nextTokenId);
        _tokenURIs[nextTokenId] = _tokenURI;
        nextTokenId++;
    }

    // Mint to a specific address and return the tokenId
    function mintTo(address to, string memory _tokenURI) external returns (uint256) {
        require(_minters[msg.sender] || owner() == msg.sender, "Not authorized to mint");
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = _tokenURI;
        nextTokenId++;
        return tokenId;
    }

    // Owner can add/remove minters (PackSale contract will be added as minter)
    function setMinter(address account, bool allowed) external onlyOwner {
        _minters[account] = allowed;
    }

    function isMinter(address account) external view returns (bool) {
        return _minters[account];
    }

    // Allow owner (deployer or PackSale contract if transferred) to set or update tokenURI
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external onlyOwner {
        require(tokenId < nextTokenId, "ERC721Metadata: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    // Allow owner to burn tokens (useful for upgrade flows)
    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        delete _tokenURIs[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < nextTokenId, "ERC721Metadata: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }
}

