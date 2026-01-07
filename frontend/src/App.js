import React, { useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ABI = [
  "function mint(string _tokenURI) external",
  "function nextTokenId() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

const App = () => {
  const [status, setStatus] = useState("Ready to mint!");

  async function mintNFT() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      // Initialize Ethers v6
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create Contract Instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      setStatus("Minting... please confirm in MetaMask.");

      // Metadata link - you can change this to any IPFS or web link
      const metadataURL = "https://example.com/nft-metadata.json";
      
const tx = await contract.mint(metadataURL, { 
        gasLimit: 1000000 
      });

      setStatus("Transaction sent! Waiting for network...");
      
      await tx.wait();
      setStatus("Success! NFT Minted successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Error: " + (error.reason || error.message));
    }
  }

  return (
    <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "Arial" }}>
      <header style={{ backgroundColor: "#282c34", padding: "40px", color: "white", borderRadius: "15px", display: "inline-block" }}>
        <h1>MyNFT Minter 2026</h1>
        <p>Status: <span style={{ color: "#61dafb" }}>{status}</span></p>
        <button 
          onClick={mintNFT}
          style={{ 
            padding: "15px 30px", 
            fontSize: "18px", 
            cursor: "pointer", 
            backgroundColor: "#61dafb", 
            border: "none", 
            borderRadius: "5px",
            fontWeight: "bold"
          }}
        >
          Mint My NFT
        </button>
      </header>
    </div>
  );
};

export default App; 
