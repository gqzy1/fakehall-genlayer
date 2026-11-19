import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createAccount, createClient, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const { contract_address: address, source_sha256: sourceDigest, chain_id: chainId } = read('public/deployment.json');
const seeds = read('tests/seeds.json').rounds;
const sha = (text) => createHash('sha256').update(text).digest('hex');
const reader = createClient({ chain: studionet });
const file = 'evidence/archive-showcase.json';
const checkpoint = process.argv[2];
const verify = checkpoint === '--verify';
assert.ok(checkpoint, 'Provide a private checkpoint path or --verify');
assert.equal(await reader.getChainId(), chainId);
assert.equal(sha(await reader.getContractCode(address)), sourceDigest);
const evidence = fs.existsSync(file) ? read(file) : { chainId, address, cases: {} };
assert.equal(evidence.address, address);
const save = () => fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');

const scenarios = [
  { seed: 2, theme: 'Sutton Hoo Helmet — The Dating Dispute', finish: 'archive', verdict: 'FAKE_A' },
  { seed: 5, theme: 'Tutankhamun’s Mask — The Provenance Dispute', finish: 'archive', verdict: 'FAKE_B' },
  { seed: 3, theme: 'Tutankhamun’s Mask — Two Conflicting Records', finish: 'archive', verdict: 'VOID' },
  { seed: 6, theme: 'The Rosetta Stone — Same Facts, Different Wording', finish: 'voting' },
  { seed: 2, theme: 'Sutton Hoo Helmet — Open Investigation', finish: 'open' },
  { seed: 5, theme: 'Tutankhamun’s Mask — Open Investigation', finish: 'open' },
];

function resolveItem(item) {
  if (typeof item !== 'string') return item;
  const [, round, side] = item.match(/^SAME_AS_ROUND_(\d+)_ITEM_([AB])$/) ?? [];
  assert.ok(round, item);
  return resolveItem(seeds[Number(round) - 1]['item_' + side.toLowerCase()]);
}

const readRound = async (id) => JSON.parse(await reader.readContract({
  address, functionName: 'get_round', args: [id], transactionHashVariant: 'latest-final',
}));

async function receipt(hash) {
  for (let attempt = 0; attempt < 18; attempt++) {
    try {
      return await reader.waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 4000, retries: 7, fullTransaction: true });
    } catch (error) {
      if (attempt === 17) throw error;
      await delay(4000);
    }
  }
}

function observed(tx) {
  const leader = Array.isArray(tx.consensus_data?.leader_receipt)
    ? tx.consensus_data.leader_receipt.find((entry) => entry.mode === 'leader')
    : tx.consensus_data?.leader_receipt;
  assert.ok([7, 'FINALIZED'].includes(tx.status));
  return { status: tx.status, consensus: tx.result, execution: leader?.execution_result, error: leader?.error || null };
}
const success = (r) => [6, 'MAJORITY_AGREE'].includes(r.consensus) && r.execution === 'SUCCESS';

if (verify) {
  assert.equal(Object.keys(evidence.cases).length, scenarios.length);
  const latest = JSON.parse(await reader.readContract({
    address, functionName: 'get_all_rounds', args: [], transactionHashVariant: 'latest-final',
  }));
  for (const item of Object.values(evidence.cases)) {
    const current = latest.find((round) => round.round_id === item.id);
    assert.equal(current?.theme, item.theme);
    assert.ok(item.readback, 'Missing recorded readback for case ' + item.id);
    if (item.readback.status === 'REVEALED') assert.deepEqual(current, item.readback);
  }
  const steps = Object.values(evidence.cases).flatMap((item) => Object.values(item.steps));
  for (let start = 0; start < steps.length; start += 3) {
    await Promise.all(steps.slice(start, start + 3).map(async (step) => {
      const tx = await reader.getTransaction({ hash: step.hash });
      assert.deepEqual(observed(tx), step.receipt, step.hash);
    }));
    await delay(1500);
  }
  console.log('Archive showcase verified');
  process.exit(0);
}

const keys = fs.existsSync(checkpoint) ? read(checkpoint) : {};
function saveKeys() {
  fs.writeFileSync(checkpoint, JSON.stringify(keys), { mode: 0o600 });
}

async function step(item, key, signer, method, args) {
  let record = item.steps[key];
  if (!record) {
    await delay(3100);
    const client = createClient({ chain: studionet, account: createAccount(signer) });
    const hash = await client.writeContract({ address, functionName: method, args, value: 0n, leaderOnly: false });
    record = item.steps[key] = { method, hash };
    save();
    console.log(item.id, key, hash);
  }
  if (!record.receipt) {
    record.receipt = observed(await receipt(record.hash));
    save();
    console.log(item.id, key, record.receipt);
  }
  return record.receipt;
}
async function requireStep(...args) {
  const result = await step(...args);
  assert.ok(success(result), JSON.stringify(result));
}

async function finish(item, scenario, wallet) {
  if (scenario.finish !== 'open') {
    const ballot = [scenario.verdict === 'FAKE_A' ? 'FAKE_A' : 'FAKE_B',
      scenario.verdict === 'FAKE_A' ? 'DATE_MISMATCH' : 'PROVENANCE_MISMATCH',
      'Showcase test ballot based on the cited exhibit record.', wallet.ballotSalt];
    const choice = createAccount(wallet.detective).address.toLowerCase();
    const commitment = sha(['fakehall-v2', address.toLowerCase(), item.id, choice,
      ballot[0], ballot[1], ballot[3], ballot[2]].join(':'));
    await requireStep(item, 'commit', wallet.detective, 'commit_investigation', [item.id, commitment]);
    if (scenario.finish === 'archive') {
      await requireStep(item, 'lock', wallet.forger, 'open_ballot_reveal', [item.id]);
      await requireStep(item, 'reveal', wallet.detective, 'reveal_investigation', [item.id, ...ballot]);
      let judged = false;
      for (let attempt = 1; attempt <= 3 && !judged; attempt++) {
        judged = success(await step(item, 'judge_' + attempt, wallet.forger, 'close_and_judge', [item.id]));
      }
      const round = await readRound(item.id);
      if (!judged) {
        assert.equal(round.status, 'BALLOT_REVEAL');
        item.readback = round;
        item.note = 'The judgment attempts failed. The revealed ballot remains available for judgment.';
        save();
        return;
      }
      if (round.verdict !== scenario.verdict || scenario.verdict === 'VOID') {
        await requireStep(item, 'archive', wallet.detective, 'archive_judged_round', [item.id]);
      } else {
        await requireStep(item, 'archive', wallet.forger, 'reveal_forgery',
          [item.id, scenario.verdict, wallet.forgerSalt, 'Recorded demonstration case.']);
      }
    }
  }
  const result = await readRound(item.id);
  assert.equal(result.status, { open: 'OPEN', voting: 'VOTING', archive: 'REVEALED' }[scenario.finish]);
  item.readback = result;
  save();
}

const accum = [];
const existing = JSON.parse(await reader.readContract({
  address, functionName: 'get_all_rounds', args: [], transactionHashVariant: 'latest-final',
}));
let id = Math.max(0, ...existing.map((r) => r.round_id)) + 1;
for (const [index, scenario] of scenarios.entries()) {
  const seed = seeds[scenario.seed - 1];
  const key = String(index + 1);
  if (!keys[key]) {
    keys[key] = {
      forger: generatePrivateKey(), detective: generatePrivateKey(),
      ballotSalt: randomBytes(32).toString('hex'), forgerSalt: randomBytes(32).toString('hex'),
    };
    saveKeys();
  }
  const wallet = keys[key];
  const item = evidence.cases[key] ??= { id, theme: scenario.theme, steps: {} };
  if (!item.steps.create) assert.equal(item.id, id);
  const intended = scenario.verdict === 'FAKE_A' ? 'FAKE_A' : 'FAKE_B';
  await requireStep(item, 'create', wallet.forger, 'create_round', [
    scenario.theme, JSON.stringify(resolveItem(seed.item_a)), JSON.stringify(resolveItem(seed.item_b)),
    seed.source_url, seed.backup_source_url, sha([item.id, intended, wallet.forgerSalt].join(':')),
    scenario.finish === 'archive' ? 1 : 3,
  ]);
  assert.equal((await readRound(item.id)).theme, scenario.theme);
  id = Math.max(id, item.id + 1);
  if (!item.readback) accum.push(finish(item, scenario, wallet).then(
    () => ({ ok: true }), (error) => ({ ok: false, error: String(error) }),
  ));
}
const failures = (await Promise.all(accum)).filter((r) => !r.ok);
assert.deepEqual(failures, []);
console.log('Showcase expansion finalized');
