// FakeHall chain layer — GenLayer Stable Studionet only (Chain ID 61999).
// Reads are pinned to the "latest-final" string literal. Writes go through an
// injected EVM wallet (OKX first) or a labelled in-browser ephemeral test
// account. No private keys are ever written to disk or sent anywhere.
//
// GATE 11 (critical): the export gate's `is_finalized_readback` flag is set
// HERE, inside the readback functions below, derived from an actual
// latest-final read that returned data. No caller and no export function
// ever assigns that flag. (P12 failed independent verification by having
// its caller synthesize `finalized: true`; FakeHall must not repeat it.)

import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CHAIN_ID = 61999;
export const CHAIN_ID_HEX = '0xf22f';
export const RPC_URL = 'https://studio.genlayer.com/api';
export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com';

// Contract address + deployment facts come from the served config file
// public/deployment.json — never from a hardcoded guess in this code.
export let DEPLOYMENT = null;
export async function loadDeployment() {
  const res = await fetch('./deployment.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('deployment.json not served (' + res.status + ')');
  DEPLOYMENT = await res.json();
  if (!/^0x[0-9a-fA-F]{40}$/.test(DEPLOYMENT.contract_address || '')) {
    throw new Error('deployment.json has no valid contract_address');
  }
  return DEPLOYMENT;
}
export const contractAddress = () => DEPLOYMENT.contract_address;
export const explorerTx = (h) => EXPLORER_BASE + '/tx/' + h;
export const explorerAddress = (a) => EXPLORER_BASE + '/address/' + a;

// Read-only client (no account). All reads go through it.
export const reader = createClient({ chain: studionet });

// --- Readbacks. Each returns the parsed data PLUS is_finalized_readback,
// derived inside this function from the latest-final read itself. ---------
function withFinalizedFlag(raw, data) {
  // The flag is a boolean computed from the read actually returning data
  // under transactionHashVariant 'latest-final' — never a literal `true`
  // written by a caller, and never present on preview/seed objects.
  const is_finalized_readback = typeof raw === 'string' && raw.length > 2 && data !== null && data !== undefined;
  return { ...data, is_finalized_readback };
}

export async function readRound(roundId) {
  const raw = await reader.readContract({
    address: contractAddress(),
    functionName: 'get_round',
    args: [roundId],
    transactionHashVariant: 'latest-final',
  });
  return withFinalizedFlag(raw, JSON.parse(raw));
}

export async function readAllRounds() {
  const raw = await reader.readContract({
    address: contractAddress(),
    functionName: 'get_all_rounds',
    args: [],
    transactionHashVariant: 'latest-final',
  });
  const data = JSON.parse(raw);
  const is_finalized_readback = typeof raw === 'string' && raw.length > 2 && Array.isArray(data);
  return { rounds: data, is_finalized_readback };
}

export async function readLeaderboards() {
  const raw = await reader.readContract({
    address: contractAddress(),
    functionName: 'get_leaderboards',
    args: [],
    transactionHashVariant: 'latest-final',
  });
  const data = JSON.parse(raw);
  const is_finalized_readback = typeof raw === 'string' && raw.length > 2 && data !== null;
  return { ...data, is_finalized_readback };
}

export async function readGallery() {
  const raw = await reader.readContract({
    address: contractAddress(),
    functionName: 'get_revealed_gallery',
    args: [],
    transactionHashVariant: 'latest-final',
  });
  const data = JSON.parse(raw);
  const is_finalized_readback = typeof raw === 'string' && raw.length > 2 && Array.isArray(data);
  return { gallery: data, is_finalized_readback };
}

// --- Receipt waiting (paced: Studio RPC limit is 30 req/min) --------------
export async function waitFinalized(hash, { retries = 40, interval = 3000 } = {}) {
  return reader.waitForTransactionReceipt({
    hash,
    status: 'FINALIZED',
    interval,
    retries,
    fullTransaction: true,
  });
}

export function leaderReceipt(tx) {
  let r = tx?.consensus_data?.leader_receipt;
  if (Array.isArray(r)) r = r.find((x) => x.mode === 'leader');
  return r || null;
}
export function leaderPayload(tx) {
  const r = leaderReceipt(tx);
  if (!r) return '';
  if (r.result?.payload) return String(r.result.payload);
  if (typeof r.result?.raw === 'string') {
    try { return Buffer.from(r.result.raw, 'base64').toString(); } catch { return ''; }
  }
  return '';
}
export function leaderExecution(tx) {
  return leaderReceipt(tx)?.execution_result || null;
}

// --- Wallets ---------------------------------------------------------------
// Any injected EVM wallet may connect and read. OKX is checked first; the
// code never assumes MetaMask. Writes fall back to a labelled in-browser
// ephemeral test account (see temporaryAccount below).
export function injectedProvider() {
  if (window.okxwallet?.ethereum?.request) return window.okxwallet.ethereum;
  if (window.okxwallet?.request) return window.okxwallet;
  if (window.ethereum?.request) return window.ethereum;
  return null;
}

export async function connectInjected() {
  const provider = injectedProvider();
  if (!provider) throw new Error('NO_INJECTED_WALLET');
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (Number(chainId) !== CHAIN_ID) {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: CHAIN_ID_HEX,
        chainName: 'GenLayer Studionet',
        nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: [EXPLORER_BASE],
      }],
    });
  }
  const address = String(accounts[0]).toLowerCase();
  const client = createClient({ chain: studionet, provider, account: address });
  return { mode: 'injected', address, provider, client, signer_mode: 'INJECTED_WALLET' };
}

export async function injectedChainId() {
  const provider = injectedProvider();
  if (!provider) return null;
  try { return Number(await provider.request({ method: 'eth_chainId' })); } catch { return null; }
}

// Ephemeral test account: key lives in this tab's sessionStorage ONLY
// (never in the repo, never sent to any server). Rotating creates a fresh
// identity so one person can play forger -> detective 1 -> detective 2.
const TEMP_KEY = 'fakehall-temp-private-key';
export function temporaryAccount() {
  let pk = null;
  try { pk = sessionStorage.getItem(TEMP_KEY); } catch { /* storage unavailable */ }
  if (!pk) {
    pk = generatePrivateKey();
    try { sessionStorage.setItem(TEMP_KEY, pk); } catch { /* storage unavailable */ }
  }
  const account = createAccount(pk);
  const client = createClient({ chain: studionet, account });
  return {
    mode: 'temporary',
    address: String(account.address).toLowerCase(),
    client,
    // Honest labelling: written into the dossier export and shown in the UI.
    signer_mode: 'BROWSER_EPHEMERAL_TEST_ACCOUNT',
  };
}
export function rotateTemporaryAccount() {
  try { sessionStorage.removeItem(TEMP_KEY); } catch { /* ignore */ }
  return temporaryAccount();
}
export function destroyTemporaryAccount() {
  try { sessionStorage.removeItem(TEMP_KEY); } catch { /* ignore */ }
}

// --- Writes ----------------------------------------------------------------
// Sends a write and waits for FINALIZED. Returns { hash, receipt }.
// A receipt whose leader execution is ERROR is returned (not thrown) so the
// caller can render the fail-closed STATE-4 UI with retry; submission-time
// failures throw.
export async function sendWrite(wallet, functionName, args) {
  if (!wallet?.client) throw new Error('NO_SIGNER');
  const hash = await wallet.client.writeContract({
    address: contractAddress(),
    functionName,
    args,
    value: 0n,
    leaderOnly: false,
  });
  const receipt = await waitFinalized(hash);
  return { hash, receipt };
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const shortAddr = (a) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '—');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
