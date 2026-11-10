// FakeHall: deploy contracts/fakehall.py on Stable Studionet (chain 61999).
// Hard chain lock, fresh temp accounts (F + D1 + D2), resume-on-interrupt
// via a checkpoint file, byte-parity check after deploy.
// Temp private keys live ONLY in the checkpoint file:
//   <repo>/../../../build-fakehall/.fakehall-checkpoint.json
// (workspace, NOT in the repo, mode 0600, deleted when the flow is done
// or abandoned). No keys are written to the repo, logs, or evidence.
// Usage: node scripts/deploy_studionet.mjs [--seeds <path>] [--checkpoint <path>]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient, createAccount, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const RPC_URL = 'https://studio.genlayer.com/api';
const CHAIN_ID = 61999;
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const SEEDS_PATH = opt('--seeds', path.resolve(REPO, '..', '..', '..', 'build-fakehall', 'seeds.json'));
const CHECKPOINT = opt('--checkpoint', path.resolve(REPO, '..', '..', '..', 'build-fakehall', '.fakehall-checkpoint.json'));
const CONTRACT_PATH = path.join(REPO, 'contracts', 'fakehall.py');
const DEPLOYMENT_PATH = path.join(REPO, 'evidence', 'deployment.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash('sha256').update(s).digest('hex');

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
  } catch {
    return {wallets: {}};
  }
}
function saveCheckpoint(cp) {
  fs.mkdirSync(path.dirname(CHECKPOINT), {recursive: true});
  fs.writeFileSync(CHECKPOINT, JSON.stringify(cp, null, 2), {mode: 0o600});
  fs.chmodSync(CHECKPOINT, 0o600);
}

function leaderExec(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find((x) => x.mode === 'leader') : r;
  return r?.execution_result;
}
function good(tx) {
  return [7, 'FINALIZED'].includes(tx.status)
    && [6, 'MAJORITY_AGREE'].includes(tx.result)
    && leaderExec(tx) === 'SUCCESS';
}
async function collect(client, hash, label) {
  console.log(label, hash);
  for (let i = 0; i < 30; i++) {
    try {
      const tx = await client.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 3000, retries: 8, fullTransaction: true});
      console.log(label, 'status=', tx.status, 'result=', tx.result, 'leader=', leaderExec(tx));
      return tx;
    } catch (e) {
      console.log('tracking', label, 'attempt', i, e.shortMessage || e.message);
      await sleep(3000);
    }
  }
  throw new Error('Timeout waiting for FINALIZED: ' + label + ' ' + hash + ' — keep the hash, do not redeploy.');
}

const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
console.log('contract source sha256:', sha(source), `(${Buffer.byteLength(source)} bytes)`);
const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf8'));
console.log('seeds rounds:', seeds.rounds.length);

// Assert every seed commitment hash recomputes from (round_id, choice, salt).
for (const r of seeds.rounds) {
  const calc = sha(`${r.round_id}:${r.secret_fake_choice}:${r.salt}`);
  if (calc !== r.commitment_hash) throw new Error(`seed hash mismatch round ${r.round_id}`);
}
console.log('all 9 seed commitment hashes recompute OK');

const cp = loadCheckpoint();
for (const k of ['F', 'D1', 'D2']) {
  if (!cp.wallets[k]) {
    cp.wallets[k] = generatePrivateKey();
    console.log('generated temp account', k);
  }
}
cp.chain_id = CHAIN_ID;
cp.rpc = RPC_URL;
saveCheckpoint(cp);

const accounts = {};
for (const k of ['F', 'D1', 'D2']) accounts[k] = createAccount(cp.wallets[k]);
console.log('F :', accounts.F.address);
console.log('D1:', accounts.D1.address);
console.log('D2:', accounts.D2.address);

const deployer = createClient({chain: studionet, account: accounts.F});
const chainId = await deployer.getChainId();
if (chainId !== CHAIN_ID) throw new Error('WRONG_CHAIN: ' + chainId);
console.log('chain OK:', chainId, RPC_URL);

let address = cp.contract_address || null;
let deployTx = cp.deploy_tx || null;
if (address && deployTx) {
  console.log('resuming existing deploy', address, deployTx);
  const tx = await collect(deployer, deployTx, 'deploy (resume)');
  if (!good(tx)) throw new Error('recorded deploy tx is not good; inspect before redeploying');
} else {
  await sleep(3000);
  const hash = await deployer.deployContract({code: source, args: [], value: 0n, leaderOnly: false});
  const tx = await collect(deployer, hash, 'deploy');
  if (!good(tx)) throw new Error('deploy failed: ' + JSON.stringify(tx));
  address = tx.data?.contract_address || tx.contract_address;
  if (!address) throw new Error('no contract address in deploy receipt');
  deployTx = hash;
  cp.contract_address = address;
  cp.deploy_tx = deployTx;
  saveCheckpoint(cp);
}

await sleep(3000);
const onChain = await deployer.getContractCode(address);
if (onChain !== source) throw new Error('BYTE_PARITY_MISMATCH after deploy');
console.log('BYTE_PARITY_MATCH: TRUE');

fs.mkdirSync(path.dirname(DEPLOYMENT_PATH), {recursive: true});
const deployment = {
  network: 'Stable Studionet',
  chain_id: CHAIN_ID,
  rpc: RPC_URL,
  contract_address: address,
  deploy_tx: deployTx,
  explorer: 'https://explorer-studio.genlayer.com/address/' + address,
  source_sha256: sha(source),
  source_bytes: Buffer.byteLength(source),
  source_file: 'contracts/fakehall.py',
  byte_parity: 'BYTE_PARITY_MATCH: TRUE',
  wallets: {
    F: accounts.F.address.toLowerCase(),
    D1: accounts.D1.address.toLowerCase(),
    D2: accounts.D2.address.toLowerCase(),
  },
  note: 'Temp accounts generated for this evidence run only. No GEN moves in this contract (points only).',
};
fs.writeFileSync(DEPLOYMENT_PATH, JSON.stringify(deployment, null, 2));
console.log('deployed:', address);
console.log('deploy tx:', deployTx);
console.log('wrote', DEPLOYMENT_PATH);
