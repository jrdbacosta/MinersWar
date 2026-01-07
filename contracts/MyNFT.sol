// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; // align with project Solidity version

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("MyNFT", "NFT") Ownable(msg.sender) {}

    function mint(string memory _tokenURI) external onlyOwner {
        _safeMint(msg.sender, nextTokenId);
        _tokenURIs[nextTokenId] = _tokenURI;
        nextTokenId++;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId < nextTokenId, "ERC721Metadata: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }
}

