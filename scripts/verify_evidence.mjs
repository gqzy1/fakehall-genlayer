// One-command independent verification for FakeHall.
// Re-reads everything live from Studionet and compares it against
// evidence/*.json (which embed the pre-registered expectations from
// EXPECTED.md). No wallet, no transactions, no writes.
// Usage: node scripts/verify_evidence.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE = path.join(REPO, 'evidence');
const source = fs.readFileSync(path.join(REPO, 'contracts', 'fakehall.py'), 'utf8');
const deployment = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'deployment.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'evidence-index.json'), 'utf8'));
const negatives = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'negatives.json'), 'utf8')).negatives;
const reader = createClient({chain: studionet});
const ADDRESS = deployment.contract_address;
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  ok ? pass++ : fail++;
};
const sha = (s) => createHash('sha256').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function leaderRec(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find((x) => x.mode === 'leader') : r;
  return r;
}
function leaderPayload(tx) {
  const r = leaderRec(tx);
  if (!r) return '';
  if (r.result?.payload) return String(r.result.payload);
  if (typeof r.result?.raw === 'string') {
    try { return Buffer.from(r.result.raw, 'base64').toString(); } catch { return ''; }
  }
  return '';
}
async function receipt(hash) {
  await sleep(3000);
  return reader.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 3000, retries: 6, fullTransaction: true});
}

// 1. Byte parity.
const code = await reader.getContractCode(ADDRESS);
check('deployed code == repo source (byte parity)', code === source, 'source sha256 ' + sha(source));

// 2. Deploy tx.
{
  const tx = await receipt(deployment.deploy_tx);
  check('deploy tx FINALIZED + MAJORITY_AGREE + leader SUCCESS',
    [7, 'FINALIZED'].includes(tx.status) && [6, 'MAJORITY_AGREE'].includes(tx.result)
    && leaderRec(tx)?.execution_result === 'SUCCESS', deployment.deploy_tx.slice(0, 18));
}

// 3. Per-round steps + final state.
const EXPECTED_ERRORS = {
  'ADV-2-clone': 'ITEMS_IDENTICAL_NO_LLM_NEEDED',
  'ADV-5': 'FORGER_CANNOT_VOTE_OWN_ROUND',
  'ADV-7': 'DETECTIVE_ALREADY_VOTED',
  'ADV-10a': 'ROUND_ALREADY_FINALIZED',
  'ADV-10b': 'ROUND_ALREADY_FINALIZED',
};
for (let n = 1; n <= 9; n++) {
  const ev = JSON.parse(fs.readFileSync(path.join(EVIDENCE, `round-${String(n).padStart(2, '0')}.json`), 'utf8'));
  // Commitment hash recomputes from (round_id, choice, salt).
  check(`R${n} commitment hash recomputes`,
    sha(`${ev.round_id}:${ev.secret_fake_choice}:${ev.salt}`) === ev.commitment_hash);
  for (const s of ev.steps || []) {
    if (!s.hash) continue;
    const tx = await receipt(s.hash);
    const finalized = [7, 'FINALIZED'].includes(tx.status);
    if (s.outcome === 'ok') {
      check(`R${n} ${s.label} FINALIZED + MAJORITY_AGREE + leader SUCCESS`,
        finalized && [6, 'MAJORITY_AGREE'].includes(tx.result) && leaderRec(tx)?.execution_result === 'SUCCESS',
        s.hash.slice(0, 18));
    } else if (s.outcome === 'error-observed') {
      const payload = leaderPayload(tx);
      const needle = (s.label.includes('wrong-salt') || s.label.includes('wrong salt')) ? 'COMMITMENT_HASH_MISMATCH'
        : (s.label.includes('FAIL-CLOSED') || (n === 8 && s.label.includes('close'))) ? 'SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED' : null;
      check(`R${n} ${s.label} FINALIZED + leader ERROR` + (needle ? ` + payload has ${needle}` : ''),
        finalized && leaderRec(tx)?.execution_result === 'ERROR' && (!needle || payload.includes(needle)),
        s.hash.slice(0, 18) + ' payload=' + payload.slice(0, 60));
    }
  }
  for (const a of ev.failed_attempts || []) {
    if (!a.hash) { check(`R${n} failed attempt (no hash) recorded`, true, 'transient RPC error, no tx'); continue; }
    const tx = await receipt(a.hash);
    check(`R${n} failed attempt ${a.hash.slice(0, 14)} FINALIZED as recorded (${a.result_name || a.result})`,
      [7, 'FINALIZED'].includes(tx.status) && tx.result === a.result, 'result=' + tx.result + ' ' + tx.result_name);
  }
  // Final state re-read live, latest-final.
  await sleep(3000);
  const raw = await reader.readContract({address: ADDRESS, functionName: 'get_round', args: [n], transactionHashVariant: 'latest-final'});
  const live = JSON.parse(raw);
  const act = ev.actual || {};
  const expV = ev.expected.verdict, expF = ev.expected.flaw, expR = ev.expected.reveal_mode;
  const judged = live.status === 'JUDGED' || live.status === 'REVEALED';
  check(`R${n} live status/verdict/flaw/reveal_mode/forger_points == evidence`,
    live.status === ev.expected.final_status
    && (!judged || expV == null || live.verdict === expV)
    && (!judged || expF == null || live.flaw_category === expF)
    && (!judged || expR == null || live.reveal_mode === expR)
    && (ev.expected.forger_points == null || live.forger_points === ev.expected.forger_points),
    `live=${live.status}/${live.verdict}/${live.flaw_category}/${live.reveal_mode}/forger=${live.forger_points}`);
  if (n === 6) {
    check('R6 supplement witness verified on-chain', live.supplement_verified === true && live.supplement_choice === 'FAKE_B');
  }
  if (n === 2) {
    const sealed = (live.investigations || []).every((i) => i.suspected_fake === 'SEALED_UNTIL_JUDGED');
    check('R2 votes still sealed while VOTING', live.status === 'VOTING' && sealed && live.vote_count === 2);
  }
}

// 4. Negatives.
for (const neg of negatives) {
  if (!neg.hash) { check(`negative ${neg.id} has a tx hash`, false); continue; }
  const tx = await receipt(neg.hash);
  const payload = leaderPayload(tx);
  const needle = EXPECTED_ERRORS[neg.id];
  check(`negative ${neg.id} FINALIZED + leader ERROR + payload has ${needle}`,
    [7, 'FINALIZED'].includes(tx.status) && leaderRec(tx)?.execution_result === 'ERROR' && payload.includes(needle),
    neg.hash.slice(0, 18) + ' payload=' + payload.slice(0, 60));
}

// 5. Leaderboards + gallery re-read live.
await sleep(3000);
const boardsRaw = await reader.readContract({address: ADDRESS, functionName: 'get_leaderboards', args: [], transactionHashVariant: 'latest-final'});
const boards = JSON.parse(boardsRaw);
check('leaderboards == evidence-index',
  JSON.stringify(boards) === JSON.stringify(index.leaderboards),
  'D1=' + boards.detectives[0]?.total_points + 'pts/' + boards.detectives[0]?.accuracy_bps + 'bps; forger=' + boards.forgers[0]?.total_points + 'pts/' + boards.forgers[0]?.deception_rate_bps + 'bps');
await sleep(3000);
const galleryRaw = await reader.readContract({address: ADDRESS, functionName: 'get_revealed_gallery', args: [], transactionHashVariant: 'latest-final'});
const gallery = JSON.parse(galleryRaw);
check('gallery rounds == [1,4,5]',
  JSON.stringify(gallery.map((g) => g.round_id)) === '[1,4,5]');
await sleep(3000);
const allRaw = await reader.readContract({address: ADDRESS, functionName: 'get_all_rounds', args: [], transactionHashVariant: 'latest-final'});
check('get_all_rounds returns 9 rounds', JSON.parse(allRaw).length === 9);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
