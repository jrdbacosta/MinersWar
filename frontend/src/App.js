/* global BigInt */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Toast from './Toast';

const PACKSALE_ADDRESS = process.env.REACT_APP_PACKSALE_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ABI = [
  "function buyPack(uint256 amount) payable",
  "function openPackWithURIs(string[] calldata uris)",
  "function packs(address) view returns (uint256)",
  "function price() view returns (uint256)",
  "function itemsPerPack() view returns (uint256)"
];

const App = () => {
  const [status, setStatus] = useState("Ready");
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [packs, setPacks] = useState(0);
  const [buyAmount, setBuyAmount] = useState(1);
  const [openUris, setOpenUris] = useState("");
  const [price, setPrice] = useState(null);
  const [itemsPerPack, setItemsPerPack] = useState(null);
  const [toast, setToast] = useState('');
  const [gallery, setGallery] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('NATIVE');
  const USDC_ADDRESS = process.env.REACT_APP_USDC_ADDRESS || '';

  useEffect(() => {
    (async () => {
      try {
        const provider = new ethers.JsonRpcProvider();
        const contract = new ethers.Contract(PACKSALE_ADDRESS, ABI, provider);
        const p = await contract.price();
        const n = await contract.itemsPerPack();
        setPrice(p);
        setItemsPerPack(Number(n));
      } catch (e) {
        // ignore (network or contract not available yet)
      }
    })();

    // listen for external wallet/account changes
    if (window.ethereum) {
      try {
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts && accounts.length ? accounts[0] : null);
        });
        window.ethereum.on('chainChanged', (chain) => {
          setChainId(chain);
          // reload provider info
          const p = new ethers.BrowserProvider(window.ethereum);
          p.getNetwork().then(n => setNetworkName(n.name)).catch(()=>{});
        });
      } catch (e) {}
    }
  }, []);

  async function connectWallet() {
    if (!window.ethereum) return alert('Install MetaMask');
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const net = await provider.getNetwork();
      setChainId(window.ethereum.chainId || null);
      setNetworkName(net.name || null);
      setAccount(addr);
      fetchPacks(addr);
      setToast('Wallet connected');
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPacks(addr) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(PACKSALE_ADDRESS, ABI, provider);
      const p = await contract.packs(addr);
      setPacks(Number(p));
    } catch (e) {
      console.error(e);
    }
  }

  async function buyPack() {
    if (!window.ethereum) return alert('Install MetaMask');
    try {
      setStatus('Waiting for wallet...');
      setToast('Confirm purchase in wallet');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddr = await signer.getAddress();
      const net = await provider.getNetwork();
      console.log('Buying pack — signer:', signerAddr, 'network:', net);
      const contract = new ethers.Contract(PACKSALE_ADDRESS, ABI, signer);
      const total = price * BigInt(buyAmount);
      let tx;
      if (paymentMethod === 'USDC' && USDC_ADDRESS) {
        // ERC20 flow: approve then buy
        const erc20 = new ethers.Contract(USDC_ADDRESS, ['function allowance(address owner, address spender) view returns (uint256)','function approve(address spender, uint256 amount) returns (bool)'], signer);
        const allowance = await erc20.allowance(await signer.getAddress(), PACKSALE_ADDRESS);
        if (BigInt(allowance) < BigInt(total)) {
          const apptx = await erc20.approve(PACKSALE_ADDRESS, total);
          setToast('Approve transaction sent');
          await apptx.wait();
        }
        tx = await contract.buyPack(BigInt(buyAmount));
      } else {
        const value = total;
        tx = await contract.buyPack(BigInt(buyAmount), { value });
      }
      setStatus('Transaction sent — waiting...');
      setToast('Purchase sent — waiting for confirmation');
      await tx.wait();
      setStatus('Purchase successful');
      setToast('Purchase successful');
      fetchPacks(await signer.getAddress());
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + (err.reason || err.message));
      setToast('Error: ' + (err.reason || err.message));
    }
  }

  async function switchToLocalhost() {
    if (!window.ethereum) return alert('No injected wallet');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }]
      });
      setChainId('0x7a69');
      setToast('Switched to Localhost');
    } catch (switchError) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7a69',
            chainName: 'Localhost 8545',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
          }]
        });
        setChainId('0x7a69');
        setToast('Added Localhost network');
      } catch (addErr) {
        console.error(addErr);
        setToast('Failed to switch/add network');
      }
    }
  }

  async function openPack() {
    if (!window.ethereum) return alert('Install MetaMask');
    try {
      const uris = openUris.split(',').map(s => s.trim()).filter(Boolean);
      if (uris.length === 0) return setToast('Enter URIs separated by commas');
      if (itemsPerPack && uris.length % itemsPerPack !== 0) return setToast(`URI count must be a multiple of ${itemsPerPack}`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(PACKSALE_ADDRESS, ABI, signer);
      const tx = await contract.openPackWithURIs(uris);
      setStatus('Opening pack — waiting...');
      setToast('Opening pack — confirm in wallet');
      await tx.wait();
      setStatus('Pack opened — NFTs minted');
      setToast('Pack opened — NFTs minted');
      fetchPacks(await signer.getAddress());
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + (err.reason || err.message));
      setToast('Error: ' + (err.reason || err.message));
    }
  }

  // NFT gallery: fetch tokenURIs owned by the connected account
  async function fetchNFTs() {
    if (!account) return setToast('Connect wallet to view NFTs');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum || undefined);
      const nftAbi = [
        'function nextTokenId() view returns (uint256)',
        'function ownerOf(uint256) view returns (address)',
        'function tokenURI(uint256) view returns (string)'
      ];
      const nftContract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS || PACKSALE_ADDRESS, nftAbi, provider);
      const nextId = Number(await nftContract.nextTokenId());
      const owned = [];
      for (let i = 0; i < nextId; i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          if (owner.toLowerCase() === account.toLowerCase()) {
            const uri = await nftContract.tokenURI(i);
            owned.push({ id: i, uri });
          }
        } catch (e) {
          // skip burned/nonexistent
        }
      }
      setGallery(owned);
    } catch (e) {
      console.error(e);
      setToast('Failed to fetch NFTs');
    }
  }

  return (
    <div style={{ textAlign: "center", marginTop: "40px", fontFamily: "Arial" }}>
      <header style={{ backgroundColor: "#282c34", padding: "20px", color: "white", borderRadius: "10px", display: "inline-block" }}>
        <h1>PackSale Demo</h1>
        <p>Contract: {PACKSALE_ADDRESS}</p>
        <p>Status: <span style={{ color: "#61dafb" }}>{status}</span></p>
        <div style={{ margin: '10px' }}>
          {account ? (
            <div>
              <div>Connected: {account}</div>
              <div style={{ fontSize: 12, marginTop: 6, color: '#9bd' }}>
                Chain: {chainId || window.ethereum?.chainId || 'n/a'}
                {networkName ? ` — ${networkName}` : ''}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, color: '#9bd' }}>
                Selected: {window.ethereum?.selectedAddress || 'n/a'}
              </div>
            </div>
          ) : (
            <button onClick={connectWallet} style={{ padding: '10px 16px' }}>Connect Wallet</button>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <input type="number" value={buyAmount} min={1} onChange={e => setBuyAmount(Number(e.target.value))} />
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="NATIVE">Native</option>
            <option value="USDC">USDC</option>
          </select>
          {account && (chainId === '0x7a69') ? (
            <button onClick={buyPack} style={{ marginLeft: 8 }}>Buy Pack</button>
          ) : (
            <button onClick={switchToLocalhost} style={{ marginLeft: 8 }}>Switch to Localhost</button>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <input type="number" value={buyAmount} min={1} onChange={(e) => setBuyAmount(Math.max(1, Number(e.target.value)))} style={{ width: 80 }} />
          <button onClick={buyPack} disabled={!(account && chainId === '0x7a69')} style={{ marginLeft: 8, padding: '8px 12px' }}>{(account && chainId === '0x7a69') ? 'Buy Pack' : 'Switch to Localhost'}</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div>Your packs: {packs}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <textarea placeholder="Enter URIs separated by commas" value={openUris} onChange={(e) => setOpenUris(e.target.value)} rows={3} cols={50} />
          <div>
            <button onClick={openPack} style={{ marginTop: 8, padding: '8px 12px' }}>Open Pack</button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={fetchNFTs} style={{ padding: '8px 12px' }}>Refresh My NFTs</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>My NFTs</h3>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {gallery && gallery.length > 0 ? gallery.map(item => (
              <div key={item.id} style={{ width: 220, border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>#{item.id}</div>
                <div style={{ fontSize: 12, marginTop: 8, wordBreak: 'break-all' }}>{item.uri}</div>
              </div>
            )) : <div>No NFTs found</div>}
          </div>
        </div>
      </header>
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
};

export default App;
