// FakeHall evidence run: 48 evidence txs (+ 1 deploy) on Stable Studionet.
// Reads seeds.json (single source of truth), asserts commitment hashes,
// runs R1..R9 + 5 standalone negatives, reads every result back from
// latest-final, writes evidence/round-XX.json + negatives.json +
// evidence-index.json.
// Idempotent: before sending a step it reads the round back; if the
// step already happened on-chain it is recovered, not re-sent. Error
// steps are safe to re-send (they revert without state change). A
// checkpoint ledger (<repo>/../../../build-fakehall/.fakehall-checkpoint.json,
// mode 0600, NOT in the repo) records every step so a restart resumes.
// Pace: >=3s between RPC calls (Studio rate-limits at 30/min, -32029).
// Usage: node scripts/run_evidence.mjs [--seeds <path>] [--checkpoint <path>]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient, createAccount} from 'genlayer-js';
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
const DEPLOYMENT_PATH = path.join(REPO, 'evidence', 'deployment.json');
const EVIDENCE_DIR = path.join(REPO, 'evidence');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const nowIso = () => new Date().toISOString();

function loadCheckpoint() {
  return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
}
function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT, JSON.stringify(cp, null, 2), {mode: 0o600});
  fs.chmodSync(CHECKPOINT, 0o600);
}
function leaderExec(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find((x) => x.mode === 'leader') : r;
  return r?.execution_result;
}
function leaderError(tx) {
  let r = tx.consensus_data?.leader_receipt;
  r = Array.isArray(r) ? r.find((x) => x.mode === 'leader') : r;
  return r?.error || r?.execution_error || null;
}
function good(tx) {
  return tx && [7, 'FINALIZED'].includes(tx.status)
    && [6, 'MAJORITY_AGREE'].includes(tx.result)
    && leaderExec(tx) === 'SUCCESS';
}
async function collect(client, hash, label) {
  console.log(' ', label, hash);
  for (let i = 0; i < 30; i++) {
    try {
      const tx = await client.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 3000, retries: 8, fullTransaction: true});
      console.log('  ', label, 'status=', tx.status, 'result=', tx.result, 'leader=', leaderExec(tx));
      return tx;
    } catch (e) {
      const msg = e.shortMessage || e.message || '';
      if (msg.includes('-32029') || msg.toLowerCase().includes('rate')) {
        console.log('   rate-limited (-32029), backing off 15s');
        await sleep(15000);
      } else {
        console.log('   tracking', label, 'attempt', i, msg.slice(0, 160));
        await sleep(3000);
      }
    }
  }
  throw new Error('Timeout waiting for FINALIZED: ' + label + ' ' + hash);
}

// ---------- load inputs ----------
const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, 'utf8'));
const ADDRESS = deployment.contract_address;
if (!ADDRESS) throw new Error('no contract address in evidence/deployment.json — run deploy first');
const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf8'));
const cp = loadCheckpoint();
if (!cp.wallets?.F || !cp.wallets?.D1 || !cp.wallets?.D2) throw new Error('checkpoint has no wallets — run deploy first');
if (!cp.steps) cp.steps = {};
if (!cp.failed_rounds) cp.failed_rounds = [];

const byId = {};
for (const r of seeds.rounds) byId[r.round_id] = r;
function resolveItems(r) {
  const get = (v) => {
    if (typeof v !== 'string') return v;
    const parts = v.split('_'); // SAME_AS_ROUND_<n>_ITEM_<A|B>
    return byId[Number(parts[3])]['item_' + parts[5].toLowerCase()];
  };
  return {a: get(r.item_a), b: get(r.item_b)};
}
for (const r of seeds.rounds) {
  const calc = sha(`${r.round_id}:${r.secret_fake_choice}:${r.salt}`);
  if (calc !== r.commitment_hash) throw new Error(`seed hash mismatch round ${r.round_id}`);
}
console.log('seeds OK: 9 rounds, hashes recompute. contract:', ADDRESS);

const reader = createClient({chain: studionet});
const clients = {};
for (const k of ['F', 'D1', 'D2']) {
  clients[k] = createClient({chain: studionet, account: createAccount(cp.wallets[k])});
}
console.log('F :', deployment.wallets.F);
console.log('D1:', deployment.wallets.D1);
console.log('D2:', deployment.wallets.D2);
const chainId = await reader.getChainId();
if (chainId !== CHAIN_ID) throw new Error('WRONG_CHAIN: ' + chainId);

// ---------- readback helpers ----------
async function readRound(id) {
  await sleep(3000);
  try {
    const raw = await reader.readContract({address: ADDRESS, functionName: 'get_round', args: [id], transactionHashVariant: 'latest-final'});
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // round does not exist yet (get_round reverts) — not an error
  }
}
async function readAllRounds() {
  await sleep(3000);
  try {
    const raw = await reader.readContract({address: ADDRESS, functionName: 'get_all_rounds', args: [], transactionHashVariant: 'latest-final'});
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function roundSummary(r) {
  if (!r) return null;
  return {round_id: r.round_id, status: r.status, verdict: r.verdict, flaw_category: r.flaw_category,
    reveal_mode: r.reveal_mode, forger_points: r.forger_points, vote_count: r.vote_count,
    forger_address: r.forger_address,
    investigations: (r.investigations || []).map((i) => ({detective: i.detective, suspected_fake: i.suspected_fake, flaw_category: i.flaw_category, points_awarded: i.points_awarded}))};
}

// ---------- step engine ----------
async function sendWrite({key, who, fn, fnArgs, expectError = null, precheck = null, roundId = null}) {
  const rec = cp.steps[key];
  if (rec && rec.outcome === 'ok') {
    console.log(`[skip] ${key} already done (${rec.hash || 'recovered'})`);
    const rb = roundId ? await readRound(roundId) : null;
    return {outcome: 'ok', hash: rec.hash || null, receipt: rec.receipt || null, round: rb, resumed: true};
  }
  if (rec && rec.outcome === 'error-observed') {
    console.log(`[skip] ${key} error already observed`);
    const rb = roundId ? await readRound(roundId) : null;
    return {outcome: 'error-observed', hash: rec.hash || null, submission_error: rec.submission_error || null, round: rb, resumed: true};
  }
  if (precheck && roundId) {
    const cur = await readRound(roundId);
    const hit = cur ? precheck(cur) : null;
    if (hit) {
      console.log(`[recover] ${key} already on-chain (${hit})`);
      cp.steps[key] = {outcome: 'ok', hash: null, recovered: hit, at: nowIso()};
      saveCheckpoint(cp);
      return {outcome: 'ok', hash: null, receipt: null, round: cur, resumed: true, recovered: hit};
    }
  }
  const client = clients[who];
  let hash = null;
  let receipt = null;
  let submissionError = null;
  try {
    await sleep(3000);
    hash = await client.writeContract({address: ADDRESS, functionName: fn, args: fnArgs, value: 0n, leaderOnly: false});
    receipt = await collect(reader, hash, key);
  } catch (e) {
    submissionError = (e.shortMessage || e.message || String(e)).slice(0, 500);
    console.log(`[submit-error] ${key}:`, submissionError.slice(0, 200));
  }
  const ok = good(receipt);
  if (expectError) {
    const observed = !ok; // either a failed receipt or a submission-time revert
    const needleHit = (submissionError && submissionError.includes(expectError))
      || (receipt && JSON.stringify(receipt).includes(expectError))
      || (leaderError(receipt) && String(leaderError(receipt)).includes(expectError));
    const entry = {outcome: observed ? 'error-observed' : 'UNEXPECTED_SUCCESS', hash,
      receipt: receipt ? {status: receipt.status, result: receipt.result, leader: leaderExec(receipt), error: leaderError(receipt)} : null,
      submission_error: submissionError, expected_error: expectError, needle_in_evidence: !!needleHit, at: nowIso()};
    cp.steps[key] = entry;
    saveCheckpoint(cp);
    const rb = roundId ? await readRound(roundId) : null;
    if (!observed) throw new Error(`step ${key}: expected revert ${expectError} but tx succeeded`);
    if (!needleHit) console.log(`[warn] ${key}: revert observed but needle '${expectError}' not in receipt/error text — see evidence`);
    return {outcome: 'error-observed', hash, receipt, submission_error: submissionError, round: rb, needleHit};
  }
  if (!ok) {
    cp.steps[key] = {outcome: 'failed', hash, receipt: receipt ? {status: receipt.status, result: receipt.result, leader: leaderExec(receipt), error: leaderError(receipt)} : null, submission_error: submissionError, at: nowIso()};
    saveCheckpoint(cp);
    const err = new Error(`step ${key} failed: hash=${hash} submission_error=${submissionError}`);
    err.stepKey = key;
    throw err;
  }
  cp.steps[key] = {outcome: 'ok', hash, receipt: {status: receipt.status, result: receipt.result, leader: leaderExec(receipt)}, at: nowIso()};
  saveCheckpoint(cp);
  const rb = roundId ? await readRound(roundId) : null;
  return {outcome: 'ok', hash, receipt, round: rb};
}

const CONFESSIONS = {
  1: 'Item B is my forgery: I moved its discovery to Champollion at Karnak in 1822.',
  3: 'Both items were tampered; the real mask was found by Carter in 1925.',
  4: 'Item A is my forgery: I moved the helmet to 1066 CE, after the Norman Conquest.',
  5: 'Item B is my forgery: I moved its discovery to Maspero in Alexandria harbour, 1881.',
};

function voteArgs(v) {
  return [v.suspected_fake, v.flaw_category, v.note];
}

async function doCreate(r) {
  const {a, b} = resolveItems(r);
  const res = await sendWrite({
    key: `r${r.round_id}.create`, who: 'F', fn: 'create_round',
    fnArgs: [r.theme, JSON.stringify(a), JSON.stringify(b), r.source_url, r.backup_source_url, r.commitment_hash, r.max_detectives],
    roundId: r.round_id,
    precheck: (cur) => (cur.round_id === r.round_id ? 'round exists' : null),
  });
  return res;
}
async function doVote(r, whoKey, v) {
  const addr = deployment.wallets[whoKey].toLowerCase();
  return sendWrite({
    key: `r${r.round_id}.vote-${whoKey.toLowerCase()}`, who: whoKey, fn: 'submit_investigation',
    fnArgs: [r.round_id, ...voteArgs(v)], roundId: r.round_id,
    precheck: (cur) => ((cur.investigations || []).some((i) => i.detective.toLowerCase() === addr) ? 'already voted' : null),
  });
}
async function doClose(r) {
  // Returns {verdict, flaw, round, tx} on success; throws on failure.
  const attempt = async () => sendWrite({
    key: `r${r.round_id}.close`, who: 'F', fn: 'close_and_judge',
    fnArgs: [r.round_id], roundId: r.round_id,
    precheck: (cur) => ((cur.status === 'JUDGED' || cur.status === 'REVEALED') ? 'already judged: ' + cur.verdict : null),
  });
  try {
    return await attempt();
  } catch (e) {
    console.log(`close r${r.round_id} failed once (${e.message.slice(0, 160)}); retrying once after 15s`);
    await sleep(15000);
    delete cp.steps[`r${r.round_id}.close`];
    return await attempt();
  }
}

// ---------- evidence files ----------
function writeRoundEvidence(r, steps, extra = {}) {
  const ev = {round_id: r.round_id, theme: r.theme, source_url: r.source_url,
    backup_source_url: r.backup_source_url, commitment_hash: r.commitment_hash,
    secret_fake_choice: r.secret_fake_choice, salt: r.salt,
    expected: {verdict: r.expected_verdict, flaw: r.expected_flaw, final_status: r.expected_final_status,
      reveal_mode: r.expected_reveal_mode, forger_points: r.expected_forger_points},
    steps, ...extra};
  fs.writeFileSync(path.join(EVIDENCE_DIR, `round-${String(r.round_id).padStart(2, '0')}.json`), JSON.stringify(ev, null, 2));
  return ev;
}
function stepRec(label, res, readback) {
  return {label, outcome: res.outcome, hash: res.hash || null,
    receipt: res.receipt ? {status: res.receipt.status, result: res.receipt.result, leader: leaderExec(res.receipt)} : null,
    submission_error: res.submission_error || null,
    readback: readback ? roundSummary(readback) : null,
    finalized: res.outcome === 'ok'};
}

const negatives = [];
try {
  const prev = JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, 'negatives.json'), 'utf8')).negatives || [];
  for (const n of prev) if (!negatives.some((x) => x.id === n.id)) negatives.push(n);
} catch { /* first run: no negatives file yet */ }
function writeNegatives() {
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'negatives.json'), JSON.stringify({negatives}, null, 2));
}
function pushNegative(entry) {
  if (!negatives.some((x) => x.id === entry.id)) negatives.push(entry);
}

// ---------- 0. clone-gate negative (before any create) ----------
console.log('\n=== NEG clone-gate (ADV-2) ===');
{
  const r1 = byId[1];
  const {a} = resolveItems(r1);
  const before = await readAllRounds();
  const res = await sendWrite({key: 'neg.clone', who: 'F', fn: 'create_round',
    fnArgs: [r1.theme, JSON.stringify(a), JSON.stringify(a), r1.source_url, r1.backup_source_url, r1.commitment_hash, r1.max_detectives],
    expectError: 'ITEMS_IDENTICAL_NO_LLM_NEEDED'});
  const after = await readAllRounds();
  pushNegative({id: 'ADV-2-clone', action: 'create_round with item_a identical to item_b',
    expected_error: 'ITEMS_IDENTICAL_NO_LLM_NEEDED', ...stepRec('clone-gate create', res, null),
    rounds_before: before.length, rounds_after: after.length, no_round_created: after.length === before.length});
  writeNegatives();
}

// ---------- round runner ----------
async function runRound(r) {
  const steps = [];
  const rid = r.round_id;
  console.log(`\n=== R${rid} ${r.theme} ===`);
  // Resume fast-path: a round that already reached its expected final
  // state is verified from a live readback, not re-executed.
  {
    const existing = await readRound(rid);
    let finalOk = false;
    if (existing) {
      if (rid === 2) {
        finalOk = existing.status === 'VOTING' && existing.vote_count === 2;
      } else {
        finalOk = existing.status === r.expected_final_status
          && (r.expected_verdict === null || existing.verdict === r.expected_verdict)
          && (r.expected_flaw === null || existing.flaw_category === r.expected_flaw)
          && (r.expected_reveal_mode === null || existing.reveal_mode === r.expected_reveal_mode);
      }
    }
    if (finalOk) {
      // Do not rewrite a round file that already matches the live state:
      // the main run's files carry the original step labels and readbacks.
      const evPath = path.join(EVIDENCE_DIR, `round-${String(rid).padStart(2, '0')}.json`);
      let keepExisting = false;
      try {
        const prevEv = JSON.parse(fs.readFileSync(evPath, 'utf8'));
        const fr = prevEv.final_readback || {};
        keepExisting = fr.status === existing.status
          && (fr.verdict ?? null) === (existing.verdict ?? null)
          && (fr.flaw_category ?? null) === (existing.flaw_category ?? null)
          && (fr.reveal_mode ?? null) === (existing.reveal_mode ?? null)
          && fr.forger_points === existing.forger_points
          && (prevEv.failed !== true);
      } catch { keepExisting = false; }
      if (keepExisting) {
        console.log(`R${rid} already final (${existing.status}); file already matches live readback, kept`);
        return {round_id: rid, failed: false};
      }
      const order = ['create', 'vote-d1', 'vote-d2', 'close', 'reveal-wrong-salt', 'reveal', 'resolve', 'archive', 'supplement', 'cancel'];
      for (const k of order) {
        const rec = cp.steps[`r${rid}.${k}`];
        if (!rec) continue;
        steps.push({label: `r${rid}.${k}`, outcome: rec.outcome, hash: rec.hash || null,
          receipt: rec.receipt || null, submission_error: rec.submission_error || null,
          readback: null, finalized: rec.outcome === 'ok'});
      }
      writeRoundEvidence(r, steps, {final_readback: roundSummary(existing),
        actual: {status: existing.status, verdict: existing.verdict, flaw: existing.flaw_category,
          reveal_mode: existing.reveal_mode, forger_points: existing.forger_points,
          d1_points: (existing.investigations || [])[0] ? existing.investigations[0].points_awarded : null,
          d2_points: (existing.investigations || [])[1] ? existing.investigations[1].points_awarded : null,
          supplement_verified: existing.supplement_verified, supplement_choice: existing.supplement_choice},
        resumed_verified: true});
      console.log(`R${rid} already final (${existing.status}); verified from live readback`);
      return {round_id: rid, failed: false};
    }
  }
  if (cp.failed_rounds.includes(rid)) {
    console.log(`R${rid} marked FAILED earlier; skipping chain`);
    const rb = await readRound(rid);
    writeRoundEvidence(r, steps, {failed: true, final_readback: roundSummary(rb), note: 'skipped: earlier FAILED verdict'});
    return {round_id: rid, failed: true};
  }
  const failRound = async (note, rb) => {
    cp.failed_rounds.push(rid);
    saveCheckpoint(cp);
    writeRoundEvidence(r, steps, {failed: true, note, final_readback: roundSummary(rb)});
    console.log(`R${rid} FAILED: ${note}`);
    return {round_id: rid, failed: true};
  };

  let res = await doCreate(r);
  steps.push(stepRec('create_round', res, res.round));
  let cur = res.round;
  if (!cur) throw new Error(`R${rid} create readback missing`);

  if (rid === 9) {
    res = await sendWrite({key: `r${rid}.cancel`, who: 'F', fn: 'cancel_open_round', fnArgs: [rid], roundId: rid,
      precheck: (c) => (c.status === 'CANCELLED' ? 'already cancelled' : null)});
    steps.push(stepRec('cancel_open_round', res, res.round));
    cur = res.round;
    writeRoundEvidence(r, steps, {final_readback: roundSummary(cur),
      actual: {status: cur.status, verdict: cur.verdict, flaw: cur.flaw_category, forger_points: cur.forger_points}});
    console.log(`R${rid} final:`, cur.status);
    return {round_id: rid, failed: false};
  }

  for (const v of r.votes) {
    res = await doVote(r, v.detective, v);
    steps.push(stepRec(`vote ${v.detective} ${v.suspected_fake}`, res, res.round));
    cur = res.round;
  }
  if (rid === 2) {
    // Sealed-board check: votes must be masked while VOTING.
    const masked = cur;
    const sealed = (masked.investigations || []).every((i) => i.suspected_fake === 'SEALED_UNTIL_JUDGED'
      && i.flaw_category === 'SEALED_UNTIL_JUDGED' && i.detective_note === 'SEALED_UNTIL_JUDGED');
    console.log('R2 sealed board:', sealed, 'vote_count:', masked.vote_count);
    if (!sealed) throw new Error('R2 votes not sealed while VOTING');
    // ADV-5 self-vote.
    res = await sendWrite({key: 'neg.self-vote', who: 'F', fn: 'submit_investigation',
      fnArgs: [rid, 'FAKE_A', 'DATE_MISMATCH', 'forger voting own round'], roundId: rid,
      expectError: 'FORGER_CANNOT_VOTE_OWN_ROUND'});
    pushNegative({id: 'ADV-5', action: 'forger calls submit_investigation on own round 2',
      expected_error: 'FORGER_CANNOT_VOTE_OWN_ROUND', ...stepRec('self-vote', res, res.round),
      vote_count_after: res.round ? res.round.vote_count : null});
    // ADV-7 duplicate vote.
    res = await sendWrite({key: 'neg.dup-vote', who: 'D1', fn: 'submit_investigation',
      fnArgs: [rid, 'FAKE_A', 'DATE_MISMATCH', 'second vote'], roundId: rid,
      expectError: 'DETECTIVE_ALREADY_VOTED'});
    pushNegative({id: 'ADV-7', action: 'detective D1 votes twice on round 2',
      expected_error: 'DETECTIVE_ALREADY_VOTED', ...stepRec('duplicate vote', res, res.round),
      vote_count_after: res.round ? res.round.vote_count : null});
    writeNegatives();
    writeRoundEvidence(r, steps, {final_readback: roundSummary(cur),
      actual: {status: cur.status, verdict: cur.verdict, flaw: cur.flaw_category, forger_points: null},
      sealed_board_verified: sealed});
    console.log('R2 final: VOTING (demo round, 2 sealed votes)');
    return {round_id: rid, failed: false};
  }

  // Close (R8: expected fail-closed error, then resolve).
  if (rid === 8) {
    res = await sendWrite({key: `r${rid}.close`, who: 'F', fn: 'close_and_judge', fnArgs: [rid], roundId: rid,
      expectError: 'SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED'});
    steps.push(stepRec('close_and_judge (expected FAIL-CLOSED)', res, res.round));
    cur = res.round;
    if (!cur || cur.status !== 'VOTING' || cur.verdict !== null) {
      return failRound('R8 close did not stay VOTING with no verdict', cur);
    }
    console.log('R8 fail-closed confirmed: stays VOTING');
    res = await sendWrite({key: `r${rid}.resolve`, who: 'D1', fn: 'resolve_unreachable_round', fnArgs: [rid], roundId: rid,
      precheck: (c) => ((c.status === 'JUDGED' && c.verdict === 'VOID') ? 'already resolved VOID' : null)});
    steps.push(stepRec('resolve_unreachable_round', res, res.round));
    cur = res.round;
    if (cur.verdict !== 'VOID' || cur.flaw_category !== 'NONE') {
      return failRound(`R8 resolve verdict ${cur.verdict}/${cur.flaw_category} != VOID/NONE`, cur);
    }
  } else {
    try {
      res = await doClose(r);
    } catch (e) {
      const rb = await readRound(rid);
      return failRound('close_and_judge failed twice: ' + e.message.slice(0, 200), rb);
    }
    steps.push(stepRec('close_and_judge', res, res.round));
    cur = res.round;
    if (cur.verdict !== r.expected_verdict || cur.flaw_category !== r.expected_flaw) {
      return failRound(`close verdict ${cur.verdict}/${cur.flaw_category} != expected ${r.expected_verdict}/${r.expected_flaw}`, cur);
    }
    console.log(`R${rid} judged: ${cur.verdict}/${cur.flaw_category} (expected)`);
  }

  // R5: wrong-salt reveal first (ADV-4).
  if (rid === 5) {
    res = await sendWrite({key: `r${rid}.reveal-wrong-salt`, who: 'F', fn: 'reveal_forgery',
      fnArgs: [rid, r.secret_fake_choice, 'wrong_salt_attempt', ''], roundId: rid,
      expectError: 'COMMITMENT_HASH_MISMATCH'});
    steps.push(stepRec('reveal_forgery (wrong salt, expected ERROR)', res, res.round));
    cur = res.round;
    if (!cur || cur.status !== 'JUDGED') {
      return failRound('R5 wrong-salt reveal changed state (expected to stay JUDGED)', cur);
    }
  }

  // Reveal / archive exit.
  if (rid === 6) {
    // ADV-8: detective archives; then forger supplements.
    res = await sendWrite({key: `r${rid}.archive`, who: 'D1', fn: 'archive_judged_round', fnArgs: [rid], roundId: rid,
      precheck: (c) => ((c.status === 'REVEALED' && (c.reveal_mode === 'VOID_ARCHIVED' || c.reveal_mode === 'CONSENSUS_ARCHIVED')) ? 'already archived' : null)});
    steps.push(stepRec('archive_judged_round (by detective D1)', res, res.round));
    cur = res.round;
    if (cur.reveal_mode !== 'VOID_ARCHIVED' || cur.forger_points !== 0) {
      return failRound(`R6 archive mode ${cur.reveal_mode} != VOID_ARCHIVED`, cur);
    }
    res = await sendWrite({key: `r${rid}.supplement`, who: 'F', fn: 'supplement_forger_reveal',
      fnArgs: [rid, r.secret_fake_choice, r.salt], roundId: rid,
      precheck: (c) => (c.supplement_verified ? 'already supplemented' : null)});
    steps.push(stepRec('supplement_forger_reveal', res, res.round));
    cur = res.round;
    if (!cur.supplement_verified || cur.supplement_choice !== r.secret_fake_choice || cur.forger_points !== 0) {
      return failRound('R6 supplement witness wrong or scores changed', cur);
    }
  } else if (rid === 7 || rid === 8) {
    res = await sendWrite({key: `r${rid}.archive`, who: 'F', fn: 'archive_judged_round', fnArgs: [rid], roundId: rid,
      precheck: (c) => ((c.status === 'REVEALED' && (c.reveal_mode === 'VOID_ARCHIVED' || c.reveal_mode === 'CONSENSUS_ARCHIVED')) ? 'already archived' : null)});
    steps.push(stepRec('archive_judged_round', res, res.round));
    cur = res.round;
    if (cur.reveal_mode !== r.expected_reveal_mode) {
      return failRound(`R${rid} archive mode ${cur.reveal_mode} != ${r.expected_reveal_mode}`, cur);
    }
  } else {
    res = await sendWrite({key: `r${rid}.reveal`, who: 'F', fn: 'reveal_forgery',
      fnArgs: [rid, r.secret_fake_choice, r.salt, CONFESSIONS[rid] || ''], roundId: rid,
      precheck: (c) => ((c.status === 'REVEALED' && (c.reveal_mode === 'FORGER_VERIFIED' || c.reveal_mode === 'COMMITMENT_CONTRADICTED')) ? 'already revealed' : null)});
    steps.push(stepRec('reveal_forgery', res, res.round));
    cur = res.round;
    if (cur.reveal_mode !== r.expected_reveal_mode || cur.forger_points !== r.expected_forger_points) {
      return failRound(`R${rid} reveal ${cur.reveal_mode}/${cur.forger_points} != ${r.expected_reveal_mode}/${r.expected_forger_points}`, cur);
    }
  }

  // R1 replay negatives (ADV-10) right after its reveal.
  if (rid === 1) {
    res = await sendWrite({key: 'neg.replay-reveal', who: 'F', fn: 'reveal_forgery',
      fnArgs: [rid, r.secret_fake_choice, r.salt, ''], roundId: rid,
      expectError: 'ROUND_ALREADY_FINALIZED'});
    pushNegative({id: 'ADV-10a', action: 'reveal_forgery on round 1 after it is REVEALED',
      expected_error: 'ROUND_ALREADY_FINALIZED', ...stepRec('replay reveal', res, res.round)});
    res = await sendWrite({key: 'neg.replay-archive', who: 'F', fn: 'archive_judged_round', fnArgs: [rid], roundId: rid,
      expectError: 'ROUND_ALREADY_FINALIZED'});
    pushNegative({id: 'ADV-10b', action: 'archive_judged_round on round 1 after it is REVEALED',
      expected_error: 'ROUND_ALREADY_FINALIZED', ...stepRec('replay archive', res, res.round)});
    writeNegatives();
  }

  writeRoundEvidence(r, steps, {final_readback: roundSummary(cur),
    actual: {status: cur.status, verdict: cur.verdict, flaw: cur.flaw_category,
      reveal_mode: cur.reveal_mode, forger_points: cur.forger_points,
      d1_points: (cur.investigations || [])[0] ? cur.investigations[0].points_awarded : null,
      d2_points: (cur.investigations || [])[1] ? cur.investigations[1].points_awarded : null,
      supplement_verified: cur.supplement_verified, supplement_choice: cur.supplement_choice}});
  console.log(`R${rid} final: ${cur.status} ${cur.verdict || ''} ${cur.reveal_mode || ''} forger=${cur.forger_points}`);
  return {round_id: rid, failed: false};
}

// ---------- run ----------
const results = [];
for (const r of seeds.rounds) {
  results.push(await runRound(r));
}

// ---------- final readbacks ----------
console.log('\n=== final readbacks ===');
await sleep(3000);
const allRounds = await readAllRounds();
await sleep(3000);
const boardsRaw = await reader.readContract({address: ADDRESS, functionName: 'get_leaderboards', args: [], transactionHashVariant: 'latest-final'});
const boards = boardsRaw ? JSON.parse(boardsRaw) : null;
await sleep(3000);
const galleryRaw = await reader.readContract({address: ADDRESS, functionName: 'get_revealed_gallery', args: [], transactionHashVariant: 'latest-final'});
const gallery = galleryRaw ? JSON.parse(galleryRaw) : null;

let txTotal = 0;
let finalized = 0;
for (const key of Object.keys(cp.steps)) {
  const s = cp.steps[key];
  if (s.hash) txTotal += 1;
  if (s.outcome === 'ok') finalized += 1;
}
const index = {
  network: 'Stable Studionet', chain_id: CHAIN_ID, rpc: RPC_URL,
  contract_address: ADDRESS, deploy_tx: deployment.deploy_tx,
  source_sha256: deployment.source_sha256, byte_parity: deployment.byte_parity,
  explorer: deployment.explorer,
  wallets: deployment.wallets,
  tx_total_submitted: txTotal,
  tx_finalized_ok: finalized,
  steps_recorded: Object.keys(cp.steps).length,
  rounds: results,
  failed_rounds: cp.failed_rounds,
  negatives: negatives.map((n) => ({id: n.id, expected_error: n.expected_error, outcome: n.outcome, hash: n.hash || null})),
  final_rounds: allRounds.map(roundSummary),
  leaderboards: boards,
  gallery_round_ids: (gallery || []).map((g) => g.round_id),
  generated_at: nowIso(),
};
fs.writeFileSync(path.join(EVIDENCE_DIR, 'evidence-index.json'), JSON.stringify(index, null, 2));
console.log('\nEVIDENCE COMPLETE');
console.log('tx submitted:', txTotal, '| finalized ok:', finalized, '| failed rounds:', JSON.stringify(cp.failed_rounds));
console.log('gallery rounds:', JSON.stringify(index.gallery_round_ids));
console.log('leaderboards:', JSON.stringify(boards));
console.log('wrote evidence/evidence-index.json');
