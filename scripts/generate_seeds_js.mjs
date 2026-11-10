// Generates src/seeds.js from the canonical seeds.json and verifies it
// field-for-field. The SAME_AS_* resolver is copied verbatim from
// scripts/run_evidence.mjs (resolveItems), which the independent verifier
// confirmed correct — every SAME_AS_ROUND_<n>_ITEM_<A|B> reference resolves
// to that round's item_<a|b>, NOT always item_b.
//
// Usage:
//   node scripts/generate_seeds_js.mjs [--input <seeds.json>] [--output <seeds.js>]
//   node scripts/generate_seeds_js.mjs --check   # compare src/seeds.js against seeds.json, 0 mismatches required
//
// Input resolution order: --input / FAKEHALL_SEEDS env var, then the
// canonical build workdir ~/workspace/build-fakehall/seeds.json, then the
// repo-bundled copy tests/seeds.json (byte-identical to the canonical file).
// Never hand-edit src/seeds.js — regenerate it with this script.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT = path.join(repoRoot, 'src', 'seeds.js');
const CANONICAL_PATH = path.join(os.homedir(), 'workspace', 'build-fakehall', 'seeds.json');
const BUNDLED_PATH = path.join(repoRoot, 'tests', 'seeds.json');

function defaultInput() {
  if (process.env.FAKEHALL_SEEDS) return process.env.FAKEHALL_SEEDS;
  if (fs.existsSync(CANONICAL_PATH)) return CANONICAL_PATH;
  return BUNDLED_PATH;
}

function parseArgs(argv) {
  const out = { input: null, output: DEFAULT_OUTPUT, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') out.input = argv[++i];
    else if (argv[i] === '--output') out.output = argv[++i];
    else if (argv[i] === '--check') out.check = true;
    else throw new Error('unknown argument: ' + argv[i]);
  }
  if (!out.input) out.input = defaultInput();
  return out;
}

// Resolver copied verbatim from scripts/run_evidence.mjs (resolveItems).
function resolveRounds(seeds) {
  const byId = {};
  for (const r of seeds.rounds) byId[r.round_id] = r;
  function resolveItems(r) {
    const get = (v) => {
      if (typeof v !== 'string') return v;
      const parts = v.split('_'); // SAME_AS_ROUND_<n>_ITEM_<A|B>
      return byId[Number(parts[3])]['item_' + parts[5].toLowerCase()];
    };
    return { a: get(r.item_a), b: get(r.item_b) };
  }
  return seeds.rounds.map((r) => {
    const { a, b } = resolveItems(r);
    return { ...r, item_a: a, item_b: b };
  });
}

// Recursively sort object keys so the emitted file is deterministic and
// diffs cleanly (matches the format of the previously shipped seeds.js).
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

const HEADER = `// GENERATED from seeds.json by scripts/generate_seeds_js.mjs (do not hand-edit).
// Canonical source: ~/workspace/build-fakehall/seeds.json; repo-bundled copy:
// tests/seeds.json (byte-identical). SAME_AS_* references resolved per
// scripts/run_evidence.mjs resolveItems.
// Preview seeds only: shown with a PREVIEW SEED / UNCONFIRMED badge until a
// latest-final get_* readback replaces them.
`;

function render(seeds) {
  const rounds = resolveRounds(seeds);
  const negatives = seeds.negatives_not_tied_to_a_round;
  return (
    HEADER +
    'export const SEEDS = ' +
    JSON.stringify(sortKeys(rounds), null, 1) +
    ';\n' +
    'export const NEGATIVES_NOT_TIED_TO_ROUND = ' +
    JSON.stringify(sortKeys(negatives), null, 1) +
    ';\n'
  );
}

const ITEM_FIELDS = ['title', 'image_url', 'claimed_date', 'claimed_material', 'claimed_provenance', 'narrative'];
const ROUND_FIELDS = [
  'theme', 'source_url', 'backup_source_url', 'commitment_hash', 'secret_fake_choice',
  'salt', 'expected_verdict', 'expected_flaw', 'expected_final_status', 'expected_reveal_mode',
  'expected_forger_points', 'max_detectives', 'source_quote_candidate', 'note',
];

function deepEqual(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

// Field-for-field comparison of the generated seeds against seeds.json:
// all 9 rounds x item_a/item_b x all 6 fields + commitment_hash +
// source/backup URLs + votes + negatives. Returns the mismatch list.
function check(seeds, generated) {
  const mismatches = [];
  const expected = resolveRounds(seeds);
  const byId = {};
  for (const r of generated) byId[r.round_id] = r;
  if (generated.length !== expected.length) {
    mismatches.push(`round count: generated ${generated.length} != canonical ${expected.length}`);
  }
  for (const want of expected) {
    const got = byId[want.round_id];
    if (!got) {
      mismatches.push(`R${want.round_id}: missing from generated seeds`);
      continue;
    }
    for (const f of ROUND_FIELDS) {
      if (want[f] !== undefined && !deepEqual(got[f], want[f])) {
        mismatches.push(`R${want.round_id} ${f}: got ${JSON.stringify(got[f])} != want ${JSON.stringify(want[f])}`);
      }
    }
    for (const side of ['item_a', 'item_b']) {
      for (const f of ITEM_FIELDS) {
        if (!deepEqual(got[side]?.[f], want[side]?.[f])) {
          mismatches.push(`R${want.round_id} ${side}.${f}: got ${JSON.stringify(got[side]?.[f])} != want ${JSON.stringify(want[side]?.[f])}`);
        }
      }
    }
    if (!deepEqual(got.votes, want.votes)) {
      mismatches.push(`R${want.round_id} votes: got ${JSON.stringify(got.votes)} != want ${JSON.stringify(want.votes)}`);
    }
  }
  return mismatches;
}

const args = parseArgs(process.argv.slice(2));
const seeds = JSON.parse(fs.readFileSync(args.input, 'utf8'));
if (!Array.isArray(seeds.rounds) || seeds.rounds.length !== 9) {
  throw new Error(`expected 9 rounds in ${args.input}, got ${seeds.rounds?.length}`);
}

if (args.check) {
  const mod = await import(pathToFileURL(args.output).href + '?check=' + Date.now());
  const mismatches = check(seeds, mod.SEEDS);
  // Also verify the negatives export, which check() reads off the module.
  if (!deepEqual(mod.NEGATIVES_NOT_TIED_TO_ROUND, seeds.negatives_not_tied_to_a_round)) {
    mismatches.push('NEGATIVES_NOT_TIED_TO_ROUND differs from seeds.json');
  }
  if (mismatches.length === 0) {
    console.log(`CHECK OK: 0 mismatches — ${args.output} matches ${args.input} field-for-field (9 rounds, 6 item fields each, hashes, URLs, votes, negatives).`);
  } else {
    console.log(`CHECK FAILED: ${mismatches.length} mismatch(es):`);
    for (const m of mismatches) console.log('  -', m);
    process.exit(1);
  }
} else {
  fs.writeFileSync(args.output, render(seeds));
  console.log(`wrote ${args.output} from ${args.input} (9 rounds, SAME_AS_* resolved)`);
  console.log('run with --check to verify field-for-field against seeds.json');
}
