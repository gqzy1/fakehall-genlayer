import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { abi, createAccount, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const read = (name) => JSON.parse(fs.readFileSync(name, 'utf8'));
const deployment = read('evidence/milestone-deployment.json');
const address = deployment.contract_address;
const reader = createClient({ chain: studionet });
const evidencePath = 'evidence/milestone-ballots.json';
const verifyOnly = process.argv[2] === '--verify';
const evidence = fs.existsSync(evidencePath) ? read(evidencePath) : { address, transactions: {}, readbacks: {} };
assert.equal(evidence.address, address);
const save = () => fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
assert.equal(await reader.getChainId(), 61999);
const source = fs.readFileSync('contracts/fakehall.py', 'utf8');
assert.equal(await reader.getContractCode(address), source);
assert.equal(sha(source), deployment.source_sha256);

async function receipt(hash, error) {
  for (let i = 0; i < 15; i++) {
    let tx;
    try {
      tx = await reader.waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 3200, retries: 8, fullTransaction: true });
    } catch (e) {
      if (i === 14) throw e;
      await wait(4000);
      continue;
    }
    const leader = Array.isArray(tx.consensus_data?.leader_receipt)
      ? tx.consensus_data.leader_receipt.find((row) => row.mode === 'leader')
      : tx.consensus_data?.leader_receipt;
    assert.ok([7, 'FINALIZED'].includes(tx.status));
    assert.ok([6, 'MAJORITY_AGREE'].includes(tx.result), 'Consensus did not agree');
    assert.equal(leader?.execution_result, error ? 'ERROR' : 'SUCCESS');
    if (error) {
      const payload = JSON.stringify(leader) + Buffer.from(leader?.result?.raw ?? '', 'base64').toString();
      assert.ok(payload.includes(error), 'Expected ' + error + ' in leader receipt');
    }
    return { status: tx.status, consensus: tx.result, execution: leader.execution_result };
  }
}

async function getRound() {
  return JSON.parse(await reader.readContract({
    address, functionName: 'get_round', args: [1], transactionHashVariant: 'latest-final',
  }));
}

const expectedErrors = {
  early_reveal: 'REVEAL_PHASE_CLOSED',
  duplicate_commit: 'DETECTIVE_ALREADY_COMMITTED',
  late_commit: 'COMMIT_PHASE_CLOSED',
  modified_ballot: 'BALLOT_COMMITMENT_MISMATCH',
  early_judgment: 'BALLOT_REVEAL_IN_PROGRESS',
};
const expectedSteps = [
  'create', 'commit_one', 'commit_two', 'early_reveal', 'duplicate_commit', 'lock',
  'late_commit', 'modified_ballot', 'reveal_one', 'early_judgment', 'settle', 'archive',
];

function checkResult(sealed, final) {
  assert.equal(sealed.status, 'VOTING');
  assert.equal(Object.keys(sealed.ballot_commitments).length, 2);
  assert.equal(sealed.vote_count, 0);
  assert.deepEqual(sealed.investigations, []);
  assert.equal(final.status, 'REVEALED');
  assert.equal(final.verdict, 'FAKE_B');
  assert.equal(final.vote_count, 1);
  assert.equal(final.investigations[0].points_awarded, 100);
  assert.equal(final.investigations[0].detective, deployment.wallets.D1);
  assert.ok(!(final.investigations.some((row) => row.detective === deployment.wallets.D2)));
}

if (verifyOnly) {
  await receipt(deployment.deploy_tx);
  for (const key of expectedSteps) {
    const step = evidence.transactions[key];
    assert.ok(step?.receipt, 'Missing evidence for ' + key);
    assert.deepEqual(await receipt(step.hash, expectedErrors[key]), step.receipt, key);
    await wait(1100);
  }
  const sealed = evidence.readbacks.sealed;
  for (const [key, role] of [['commit_one', 'D1'], ['commit_two', 'D2']]) {
    const step = evidence.transactions[key];
    const tx = await reader.getTransaction({ hash: step.hash });
    const call = abi.calldata.decode(Buffer.from(tx.data.calldata.base64, 'base64'));
    const sender = deployment.wallets[role];
    assert.equal(tx.from_address.toLowerCase(), sender);
    assert.equal(tx.to_address.toLowerCase(), address.toLowerCase());
    assert.equal(call.get('method'), 'commit_investigation');
    assert.equal(call.size, 2);
    assert.deepEqual(call.get('args'), [1n, sealed.ballot_commitments[sender]]);
    assert.match(call.get('args')[1], /^[a-f0-9]{64}$/);
  }
  for (const key of ['early_judgment', 'settle']) {
    const tx = await reader.getTransaction({ hash: evidence.transactions[key].hash });
    assert.ok(Number.isFinite(Date.parse(tx.created_at)), 'Missing on-chain transaction timestamp');
    const before = Date.parse(tx.created_at) < Date.parse(evidence.revealDeadline);
    assert.equal(before, key === 'early_judgment', key);
  }
  const final = await getRound();
  assert.deepEqual(final, evidence.readbacks.final);
  checkResult(sealed, final);
  console.log('Milestone evidence verified');
  process.exit(0);
}

const checkpoint = process.argv[2];
assert.ok(checkpoint, 'Pass the mode-0600 deployment checkpoint path');
const session = read(checkpoint);
assert.equal(session.deploy_tx, deployment.deploy_tx);
const clients = Object.fromEntries(Object.entries(session.wallets).map(([role, secret]) => {
  return [role, createClient({ chain: studionet, account: createAccount(secret) })];
}));
session.ballotSalts ??= { D1: randomBytes(32).toString('hex'), D2: randomBytes(32).toString('hex') };
fs.writeFileSync(checkpoint, JSON.stringify(session), { mode: 0o600 });
const ballot = {
  D1: ['FAKE_B', 'PROVENANCE_MISMATCH', 'The source identifies Bouchard and Rosetta.', session.ballotSalts.D1],
  D2: ['FAKE_A', 'DATE_MISMATCH', 'This ballot will remain unrevealed.', session.ballotSalts.D2],
};
const commitment = (role) => {
  const [choice, flaw, note, salt] = ballot[role];
  return sha(['fakehall-v2', address.toLowerCase(), 1, deployment.wallets[role], choice, flaw, salt, note].join(':'));
};
async function step(key, role, functionName, args, defer = false) {
  if (!evidence.transactions[key]) {
    await wait(3200);
    const hash = await clients[role].writeContract({ address, functionName, args, value: 0n, leaderOnly: false });
    evidence.transactions[key] = { hash, method: functionName };
    save();
    console.log(key, hash);
  }
  const entry = evidence.transactions[key];
  if (!defer && !entry.receipt) {
    entry.receipt = await receipt(entry.hash, expectedErrors[key]);
    save();
    console.log(key, entry.receipt);
  }
}

const seed = read('tests/seeds.json').rounds[0];
await step('create', 'F', 'create_round', [
  seed.theme, JSON.stringify(seed.item_a), JSON.stringify(seed.item_b), seed.source_url,
  seed.backup_source_url, seed.commitment_hash, 2,
]);
await step('commit_one', 'D1', 'commit_investigation', [1, commitment('D1')]);
await step('commit_two', 'D2', 'commit_investigation', [1, commitment('D2')]);
if (!evidence.readbacks.sealed) {
  evidence.readbacks.sealed = await getRound();
  save();
}
// Probe the unchanged state before opening the reveal phase. Use D2 for
// the early reveal with a random dummy preimage so no actual ballot leaks.
await step('early_reveal', 'D2', 'reveal_investigation', [1, 'FAKE_B', 'DATE_MISMATCH', 'Phase probe', '0'.repeat(64)], true);
await step('duplicate_commit', 'D1', 'commit_investigation', [1, '1'.repeat(64)], true);
await step('early_reveal', 'D2', 'reveal_investigation', []);
await step('duplicate_commit', 'D1', 'commit_investigation', []);
await step('lock', 'F', 'open_ballot_reveal', [1]);
if (!evidence.revealDeadline) {
  const opened = await getRound();
  assert.equal(opened.status, 'BALLOT_REVEAL');
  evidence.revealDeadline = opened.reveal_deadline;
  save();
}
await step('late_commit', 'F', 'commit_investigation', [1, '2'.repeat(64)], true);
await step('modified_ballot', 'D1', 'reveal_investigation', [1, 'FAKE_A', ...ballot.D1.slice(1)], true);
await step('reveal_one', 'D1', 'reveal_investigation', [1, ...ballot.D1], true);
await step('early_judgment', 'F', 'close_and_judge', [1], true);
await step('late_commit', 'F', 'commit_investigation', []);
await step('modified_ballot', 'D1', 'reveal_investigation', []);
await step('reveal_one', 'D1', 'reveal_investigation', []);
await step('early_judgment', 'F', 'close_and_judge', []);
await wait(Math.max(0, Date.parse(evidence.revealDeadline) - Date.now() + 3500));
await step('settle', 'D2', 'close_and_judge', [1]);
await step('archive', 'D1', 'archive_judged_round', [1]);
evidence.readbacks.final = await getRound();
save();
checkResult(evidence.readbacks.sealed, evidence.readbacks.final);
console.log('Milestone evidence captured');
