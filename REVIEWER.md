# REVIEWER.md — FakeHall 真假馆

Contract: `0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2`
([explorer](https://explorer-studio.genlayer.com/address/0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2))
Deploy tx: `0x6087639f44bad22af517d42a1264ac4fc6e719c98910dd92bf775d24fd263f0f`
Source SHA-256: `486329c536e21ad70b8e93ffae7bb0b1dcab843fc38c39897e7932defaf980f4`
(26,879 bytes, `contracts/fakehall.py`).
Network: Stable Studionet only (Chain ID 61999). No GEN moves in this
contract — points only.

## What it is

A multiplayer forgery-detection game. A forger submits two exhibit
records about one real artefact — one matches a public authoritative
source, the other is a tampered forgery. Detectives vote blind
(masked until JUDGED). Validators independently fetch the public
source + both images inside consensus, answer ONE narrow fixed
question (verdict + flaw category, exact agreement), and
deterministic code checks the source quote as a verbatim substring of
the fetched source text (tags stripped, whitespace collapsed) and
settles integer points. No time gates; no payable, stakes or withdraw.

## How to verify (one command)

```sh
node scripts/verify_evidence.mjs
```

No wallet, no transactions. It checks, all live against Studionet
(final run: **83 passed, 0 failed** — see below for the count):

1. Deployed code == `contracts/fakehall.py` byte-for-byte
   (`getContractCode`; also `python3 scripts/verify_byte_parity.py`
   → `BYTE_PARITY_MATCH: TRUE`).
2. The deploy tx FINALIZED + MAJORITY_AGREE + leader SUCCESS.
3. Every evidence transaction re-read FINALIZED: ok-steps with
   MAJORITY_AGREE + leader SUCCESS; error-steps with leader ERROR
   whose payload contains the expected error string
   (`ITEMS_IDENTICAL_NO_LLM_NEEDED`,
   `FORGER_CANNOT_VOTE_OWN_ROUND`, `DETECTIVE_ALREADY_VOTED`,
   `COMMITMENT_HASH_MISMATCH`, `SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED`,
   `ROUND_ALREADY_FINALIZED`).
4. Every final round re-read `latest-final` against EXPECTED.md
   (status / verdict / flaw / reveal mode / forger points).
5. R6's supplement witness (`supplement_verified: true`,
   `supplement_choice: FAKE_B`, scores unchanged).
6. R2's votes still sealed while VOTING.
7. Leaderboards and revealed gallery equal to
   `evidence/evidence-index.json`.
8. All recorded failed close attempts re-read FINALIZED with their
   recorded result (`MAJORITY_DISAGREE` once, `MAJORITY_AGREE` on the
   fail-closed errors).

Mock tests: `python3 -m pytest tests/test_fakehall_mock.py -q`
(**11 passed**: T-01..T-09 + resolve_unreachable_round +
seed-commitment-hash check for all 9 rounds). Lint:
`genvm-lint validate contracts/fakehall.py` passes (12 methods:
4 view, 8 write).

## Results (expected = actual, every round)

| Round | Verdict | Flaw | Status | Reveal mode | Forger | D1 | D2 |
|---|---|---|---|---|---|---|---|
| 1 Rosetta | FAKE_B | PROVENANCE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 2 Sutton Hoo | — (not judged) | — | VOTING | — | — | — | — |
| 3 Tutankhamun, both-fake | VOID | NONE | REVEALED | COMMITMENT_CONTRADICTED | 0 | 0 | 0 |
| 4 Sutton Hoo copy | FAKE_A | DATE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 5 Tutankhamun, proper | FAKE_B | PROVENANCE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 6 Rosetta, both-true | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 7 Rosetta, irrelevant source | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 8 Rosetta, dead link | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 9 Rosetta, cancel | — | — | CANCELLED | — | 0 | — | — |

Leaderboards (live): D1 300 points, 3 correct / 3 valid, accuracy
10000 bps; D2 0 points, 0/3, 0 bps. Forger 300 points, 3 fooled /
8 challenged, deception 3750 bps, 4 revealed rounds. Gallery:
rounds 1, 4, 5 only (VOID rounds are excluded by design).

Adversarial cases: ADV-1 (R3 VOID) ✓, ADV-2 (clone-gate revert +
R6 VOID) ✓, ADV-3 (R7 VOID) ✓, ADV-4 (R5 wrong-salt revert, then
correct reveal) ✓, ADV-5 (forger self-vote revert) ✓, ADV-6 (R8
fail-closed, stays VOTING) ✓, ADV-7 (duplicate-vote revert) ✓,
ADV-8 (R6 detective archive + supplement witness, scores stay 0) ✓,
ADV-9 (R8 resolve → VOID via consensus) ✓, ADV-10 (R1 replay
reveal + replay archive revert) ✓. Full tx hashes:
`evidence/round-*.json`, `evidence/negatives.json`,
`evidence/evidence-index.json`.

## Transactions

- Planned: 1 deploy + 48 evidence txs = 49.
- Actually submitted with hashes: **58** (49 planned + 9 failed
  close attempts listed below), all FINALIZED. One further R6 close
  attempt produced no hash (transient RPC submission error).
- Evidence-path ledger: 41 ok + 7 error-observed = 48 hashes.

## The R6/R7 fetch outage (read this before judging the retry count)

R6 and R7 needed extra close attempts, all recorded honestly in
`evidence/round-06.json` / `round-07.json` under `failed_attempts`:

- R3's first close (0x7589…) reached `MAJORITY_DISAGREE` (result 7):
  the leader judged VOID but the validator errored (idle), so no
  consensus and no state change; the retry (0x73ea…) is the real
  close. This is why a leader-SUCCESS receipt alone is not proof —
  the result code decides.
- R6's first four closes and R7's first five closes all fail-closed
  with `SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED`, validators agreeing
  (MAJORITY_AGREE on the error). The fetch inputs are identical to
  R1's (same Rosetta page, same image), which had already succeeded,
  and local curl of all three URLs returned 200 throughout. A
  consensus probe of the Rosetta page + image run right after the
  failures succeeded (page 200, quote found in stripped text, image
  377,171 bytes, SHA matches local), and the next close retries then
  judged both rounds VOID/NONE as expected. The cause was never
  isolated beyond a transient validator-side fetch outage
  (Wikimedia rate-limiting under validator fan-out is the known
  pattern from P12); the fail-closed design behaved exactly as
  specified — both rounds stayed VOTING with no verdict written,
  and the retries judged them. No verdict was ever fudged: every
  failed attempt is in the evidence with its hash and result.

## Accounts (temp, evidence-run only)

- Forger F: `0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4`
- Detective D1: `0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f`
- Detective D2: `0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7`
- Commitment hashes: `sha256("round_id:choice:salt")` — recompute
  from `evidence/round-*.json` (`secret_fake_choice` + `salt` are
  recorded there); the contract recomputes them in code on reveal.

## What this does NOT prove

- It does not prove the public source pages themselves are
  archaeologically true — only that the items do or do not contradict
  the stated source as fetched by the validators.
- It does not prove votes were secret from every observer: `get_*`
  reads mask votes until JUDGED, but raw transaction calldata is
  visible to anyone reading the chain directly.
- It does not prove the forger's salt is secret: the hash hides the
  choice, but a lost salt blocks `reveal_forgery` (the archive exit
  exists for exactly that case).
- It does not prove the fetch layer is reliable: R6/R7 showed the
  consensus fetch can fail-closed repeatedly during a validator-side
  outage; the mechanism's answer is retry, not a weaker check.
