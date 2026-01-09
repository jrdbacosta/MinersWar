#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('csv', { type: 'string', default: path.join(__dirname, '..', 'metadata', 'generated', 'packs-bulk.csv'), describe: 'CSV file produced by generate-bulk-packs' })
  .option('contract-address', { type: 'string', describe: 'Target contract address to call (required for live mode)' })
  .option('artifact-file', { type: 'string', default: path.join(__dirname, '..', 'artifacts', 'contracts', 'MyNFT.sol', 'MyNFT.json'), describe: 'Path to contract artifact JSON to obtain ABI' })
  .option('method', { type: 'string', default: 'mintTo', describe: 'Contract method to call for each item' })
  .option('args', { type: 'string', default: '["{to}","{uri}"]', describe: 'JSON array of method args; supports placeholders {to},{filename},{uri},{packId}' })
  .option('to', { type: 'string', describe: 'Recipient address for minted tokens (overrides {to} placeholder)' })
  .option('uri-template', { type: 'string', default: 'ipfs://REPLACE_CID/{filename}', describe: 'Template for token URI (use {filename} placeholder)' })
  .option('dry-run', { type: 'boolean', default: true, describe: 'If true only prints actions; set to false to send transactions' })
  .option('retries', { type: 'number', default: 3, describe: 'Number of retries for failed txs' })
  .option('rpc', { type: 'string', describe: 'RPC URL (env ZKSYNC_ERA_RPC_URL used if not provided)' })
  .help()
  .argv;

function parseCsv(csvPath) {
  const txt = fs.readFileSync(csvPath, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  lines.shift(); // header
  return lines.map(l => {
    // CSV format: packId,packType,seed,"a.png;b.png;..."
    const m = l.match(/^([^,]+),([^,]+),([^,]+),"([^"]*)"$/);
    if (!m) return null;
    return { packId: m[1], packType: m[2], seed: m[3], items: m[4].split(';').filter(Boolean) };
  }).filter(Boolean);
}

async function main() {
  const records = parseCsv(argv.csv);
  if (!records.length) { console.error('No records found in CSV:', argv.csv); process.exit(1); }

  const dryRun = argv['dry-run'];
  const method = argv.method;
  const argsTemplate = JSON.parse(argv.args);
  const uriTemplate = argv['uri-template'];
  const toOverride = argv.to;
  const retries = argv.retries || 3;

  let ethers;
  let signer = null;
  let contract = null;
  if (!dryRun) {
    try { ethers = require('ethers'); } catch (e) { console.error('ethers is required for live mode'); process.exit(1); }
    const rpc = argv.rpc || process.env.ZKSYNC_ERA_RPC_URL || process.env.RPC_URL;
    const pk = process.env.ZKSYNC_ERA_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!rpc || !pk || !argv['contract-address']) {
      console.error('Live mode requires --contract-address, RPC (env or --rpc) and PRIVATE_KEY env var');
      process.exit(1);
    }
    const provider = new ethers.JsonRpcProvider(rpc);
    signer = new ethers.Wallet(pk, provider);
    // load ABI from artifact
    const art = JSON.parse(fs.readFileSync(argv['artifact-file']));
    contract = new ethers.Contract(argv['contract-address'], art.abi, signer);
  }

  for (const rec of records) {
    const recipient = toOverride || (signer && signer.address) || '0x0000000000000000000000000000000000000000';
    for (const filename of rec.items) {
      const uri = uriTemplate.replace('{filename}', filename).replace('{packId}', String(rec.packId));
      const callArgs = argsTemplate.map(a => {
        if (a === '{to}') return recipient;
        if (a === '{filename}') return filename;
        if (a === '{uri}') return uri;
        if (a === '{packId}') return rec.packId;
        return a;
      });

      if (dryRun) {
        console.log('[dry-run]', `Would call ${method}(${callArgs.map(x=>JSON.stringify(x)).join(', ')}) on ${argv['contract-address'] || '<contract>'}`);
        continue;
      }

      // live call with retries
      let attempt = 0;
      while (attempt < retries) {
        try {
          console.log('Calling', method, 'with', callArgs);
          const tx = await contract[method](...callArgs);
          console.log('Sent tx:', tx.hash);
          await tx.wait();
          console.log('Confirmed');
          break;
        } catch (err) {
          attempt++;
          console.error('Call failed (attempt', attempt, '):', err && err.message ? err.message : err);
          if (attempt >= retries) {
            console.error('Exceeded retries for', filename, 'in pack', rec.packId);
          } else {
            const waitMs = 1000 * Math.pow(2, attempt);
            console.log('Retrying after', waitMs, 'ms');
            await new Promise(r => setTimeout(r, waitMs));
          }
        }
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
