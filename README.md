# FakeHall 真假馆

A multiplayer forgery-detection game on GenLayer Stable Studionet
(Chain ID 61999). A forger submits two exhibit records about one real
artefact — one matches a public authoritative source, the other is a
tampered forgery. Detectives vote blind (votes are masked until the
round is judged). Validators independently fetch the public source and
both images inside consensus, answer one narrow fixed question
(verdict + flaw category), and deterministic code settles integer
points. No GEN moves: points only, no payable, no stakes, no
withdraw. No time gates anywhere.

- **Contract:** `0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2`
  ([explorer](https://explorer-studio.genlayer.com/address/0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2))
- **Deploy tx:** `0x6087639f44bad22af517d42a1264ac4fc6e719c98910dd92bf775d24fd263f0f`
- **Source SHA-256:** `486329c536e21ad70b8e93ffae7bb0b1dcab843fc38c39897e7932defaf980f4`
  (26,879 bytes, `contracts/fakehall.py`) — byte parity verified:
  `BYTE_PARITY_MATCH: TRUE` (`python3 scripts/verify_byte_parity.py`)
- **Network:** Stable Studionet only, Chain ID 61999,
  RPC `https://studio.genlayer.com/api`

## Verdicts (all 9 rounds, read back from `latest-final`)

| Round | Theme | Verdict | Flaw | Status | Reveal mode | Forger | D1 | D2 |
|---|---|---|---|---|---|---|---|---|
| 1 | Rosetta Stone | FAKE_B | PROVENANCE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 2 | Sutton Hoo Helmet | — (not judged) | — | VOTING | — | — | — | — |
| 3 | Tutankhamun, both-fake | VOID | NONE | REVEALED | COMMITMENT_CONTRADICTED | 0 | 0 | 0 |
| 4 | Sutton Hoo copy | FAKE_A | DATE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 5 | Tutankhamun, proper | FAKE_B | PROVENANCE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 6 | Rosetta, both-true | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 7 | Rosetta, irrelevant source | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 8 | Rosetta, dead link | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 9 | Rosetta, cancel | — | — | CANCELLED | — | 0 | — | — |

Leaderboards: D1 300 points, 3/3 correct, accuracy 10000 bps; D2
0 points, 0/3, 0 bps. Forger 300 points, 3 fooled / 8 challenged,
deception 3750 bps, 4 revealed rounds. Revealed gallery: rounds 1,
4, 5. Full evidence in `evidence/` (one file per round, plus
`negatives.json` and `evidence-index.json`); pre-registration in
`EXPECTED.md`.

## How to verify (one command)

```sh
node scripts/verify_evidence.mjs
```

No wallet, no transactions. It checks, all live against Studionet:
deployed code == `contracts/fakehall.py` byte-for-byte; the deploy tx;
every evidence transaction re-read FINALIZED with the recorded
status/result/leader outcome (including the error transactions, whose
leader payloads must contain the expected error string); every final
round re-read `latest-final` against EXPECTED.md; the R6 supplement
witness; R2's votes still sealed while VOTING; leaderboards and
gallery equal to the evidence index.

## How it works

- `create_round` — forger locks two 6-field items, source + backup
  URLs, a SHA-256 commitment `sha256("round_id:choice:salt")`, and
  `max_detectives`. A deterministic clone gate rejects identical
  items (`ITEMS_IDENTICAL_NO_LLM_NEEDED`) without calling the LLM.
- `submit_investigation` — detectives vote FAKE_A/FAKE_B with a flaw
  category and a note. The forger cannot vote their own round;
  one vote per detective. Reads mask votes as `SEALED_UNTIL_JUDGED`
  until the round is JUDGED.
- `close_and_judge` — forger (with ≥1 vote) or anyone at full house.
  Validators fetch the source (fallback backup) and both images;
  unreachable → fail-closed revert, round stays VOTING. On success the
  narrow LLM question returns verdict + flaw + a source quote that
  deterministic code checks as a verbatim substring of the fetched
  source text (tags stripped, whitespace collapsed). Detectives score
  +100 correct / 0 wrong immediately; VOID scores 0 for everyone.
- `reveal_forgery` — forger only; the contract recomputes the SHA-256
  commitment in code. Match + choice == verdict → FORGER_VERIFIED,
  forger scores fooled × 100. Otherwise COMMITMENT_CONTRADICTED, 0.
- `archive_judged_round` — forger or any voted detective; the
  lost-salt exit. VOID → VOID_ARCHIVED, else CONSENSUS_ARCHIVED,
  forger 0.
- `resolve_unreachable_round` — forger or any voted detective, only
  in VOTING. Validators agree exactly on a `fetch_ok` boolean; if the
  sources are reachable the call reverts
  (`SOURCES_REACHABLE_USE_CLOSE_AND_JUDGE`); if not, the round is
  VOID with 0 points.
- `supplement_forger_reveal` — forger only, after an archive exit;
  verifies the hash and records a witness, never changes scores.
- `cancel_open_round` — forger only, OPEN + 0 votes → CANCELLED.

Mock tests: `python3 -m pytest tests/test_fakehall_mock.py -q`
(11 tests: T-01..T-09 + resolve + seed-hash check). Lint:
`genvm-lint validate contracts/fakehall.py` (12 methods: 4 view,
8 write). See `REVIEWER.md` for the full verification story and
`KNOWN_LIMITATIONS.md` for what this does not prove.
