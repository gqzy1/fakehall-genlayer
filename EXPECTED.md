# EXPECTED — FakeHall 真假馆 (pre-registration)

Written BEFORE the deploy / evidence run. The evidence run must match
this file exactly; any deviation is a failure to explain, not to edit
away. Seeds are the single source of truth in
`~/workspace/build-fakehall/seeds.json`; this file restates them so a
reviewer can check the run without that file.

Network: Stable Studionet ONLY, Chain ID 61999, RPC
https://studio.genlayer.com/api. Testnet GEN only; this contract moves
no GEN at all (points only, no payable, no stakes, no withdraw).
Explorer links: ONLY `https://explorer-studio.genlayer.com/address/<contract>`,
verified by page content containing the deploy / evidence tx hashes.

## Commitment formula (all 9 rounds)

`commitment_hash = sha256("<round_id>:<secret_fake_choice>:<salt>")`,
plain ASCII, no prefix, no trailing newline. The contract recomputes
this in code on every reveal / supplement; it never compares against a
hardcoded hash. Verified values (computed by code, see CANONICAL.md #1):

| Round | Plaintext | SHA-256 |
|---|---|---|
| 1 | `1:FAKE_B:rosetta_bouchard_1799_salt` | `fa9adda90f093dc3d20d3f67e8c44f6296b93b0014833460c1ea64a07d52cb56` |
| 2 | `2:FAKE_A:sutton_hoo_625ce_salt` | `224fa4d080179ba50f4d8a9c5beab74308a65a1263648a992b72de31f8ea6bae` |
| 3 | `3:FAKE_A:tutankhamun_void_salt` | `0807c0bd4a33eb76f25051bfa6f830156d7fa2ef9351ba4eb90820d227001e0c` |
| 4 | `4:FAKE_A:sutton_hoo_625ce_r4_salt` | `75ebf6bd6f4b4a1139b83561adbfd192581e72b0b8241998fe0b0a1c598faf53` |
| 5 | `5:FAKE_B:tutankhamun_carter_1925_salt` | `968ee265f9ccf307992a5b88d8349d241516af8f2a71e19138d9095f5f49bec4` |
| 6 | `6:FAKE_B:rosetta_bothtrue_salt` | `181e17577e227bf73f03228cb3345e670c538e7bc9ff7ed766a3851b7cc8bf62` |
| 7 | `7:FAKE_A:rosetta_solar_salt` | `bd6c06f4b655a2063c88c1208d6fc029e888c85fbeb7b3627a2e097724a55c0e` |
| 8 | `8:FAKE_B:rosetta_deadlink_salt` | `0b810f01c164ea0af8475d3b0c8894827685fde23958ea70a4c72205bc457ca5` |
| 9 | `9:FAKE_B:rosetta_cancel_salt` | `c16571cd2e3b97454bf7f5dbce08ecfbcaabada1a69313f559e46cc399b98d04` |

## Wallet plan

One forger account F + two detective accounts D1 / D2, shared across
all rounds, generated fresh for this run. Their addresses are recorded
in `evidence/deployment.json`. No GEN moves in the contract; the temp
accounts are funded only if the Studio RPC requires a balance (the
ForkSeal / probe pattern needed no funding — gas-free Studio).

## Source-quote rule (strict, pre-registered)

The leader's `source_quote`, after stripping HTML tags and collapsing
whitespace runs to single spaces, must be a contiguous substring of
each validator's own fetched source text (same normalisation). No
token-overlap tolerance. Canonical source form: the full Wikipedia
page (`en.wikipedia.org/wiki/...`); the REST summary API is rejected.
Confirmed verbatim quotes (probe-verified on-chain):

- R1 (Rosetta provenance): "It was found there in July 1799 by French army officer Pierre-François Bouchard during France's invasion of Egypt."
- R2 / R4 (Sutton Hoo date): "It was thought to be buried around the years c. 620–625 AD" (en dash U+2013)
- R3 / R5 (Tutankhamun provenance): "On 28 October 1925, they opened the innermost of three coffins to reveal the gold mask"

## Expected per-round results

Votes in every round: D1 votes the expected fake, D2 votes the other
item (fooled). So every non-VOID judged round settles D1 +100, D2 0,
and a verified forger reveal settles forger +100 (exactly one fooled
detective). `max_detectives = 3` for all rounds; close is called by the
forger with 2 votes (not full house).

| Round | Theme | Expected verdict | Expected flaw | Final status | Reveal mode | Forger pts | D1 pts | D2 pts |
|---|---|---|---|---|---|---|---|---|
| 1 | Rosetta Stone | FAKE_B | PROVENANCE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 2 | Sutton Hoo Helmet | FAKE_A (not judged — stays VOTING) | DATE_MISMATCH | VOTING | — | — | — | — |
| 3 | Tutankhamun, both-fake | VOID | NONE | REVEALED | COMMITMENT_CONTRADICTED | 0 | 0 | 0 |
| 4 | Sutton Hoo copy | FAKE_A | DATE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 5 | Tutankhamun, proper | FAKE_B | PROVENANCE_MISMATCH | REVEALED | FORGER_VERIFIED | 100 | 100 | 0 |
| 6 | Rosetta, both-true | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 7 | Rosetta, irrelevant source | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 8 | Rosetta, dead link | VOID | NONE | REVEALED | VOID_ARCHIVED | 0 | 0 | 0 |
| 9 | Rosetta, cancel | — (no verdict) | — | CANCELLED | — | 0 | — | — |

Round notes:

- R1: full loop. create → D1 FAKE_B / PROVENANCE_MISMATCH → D2 FAKE_A / DATE_MISMATCH → close_and_judge (forger) → FAKE_B / PROVENANCE_MISMATCH → reveal_forgery (FAKE_B, correct salt) → REVEALED, FORGER_VERIFIED, forger 100.
- R2: live demo round. create → D1 FAKE_A / DATE_MISMATCH → D2 FAKE_B / MATERIAL_MISMATCH → stays VOTING. `get_round` readback must show both votes as `SEALED_UNTIL_JUDGED` and no A/B counts. Its FAKE_A verdict is demonstrated separately on R4. The forger's self-vote and D1's duplicate vote are attempted here and must both revert (see negatives).
- R3 (ADV-1): both items contradict the source (A: 30 BCE + cast iron 42 kg; B: Maspero 1881 Alexandria). close → VOID / NONE, all 0. reveal_forgery with the correct salt but choice FAKE_A (≠ VOID) → REVEALED, COMMITMENT_CONTRADICTED, forger 0.
- R4: same items as R2 (new salt, new commitment). close → FAKE_A / DATE_MISMATCH. reveal → FORGER_VERIFIED, forger 100.
- R5 (ADV-4): close → FAKE_B / PROVENANCE_MISMATCH. reveal with a WRONG salt first → must revert `COMMITMENT_HASH_MISMATCH`, round stays JUDGED. Then reveal with the correct salt → FORGER_VERIFIED, forger 100.
- R6 (ADV-2 both-true + ADV-8): both items match the source (B reworded, same facts). close → VOID / NONE, all 0. Archive by DETECTIVE D1 (not the forger — lost-salt exit) → REVEALED, VOID_ARCHIVED, forger 0. Then `supplement_forger_reveal` by the forger with the correct salt → `supplement_verified: true`, `supplement_choice: FAKE_B`, all scores stay 0.
- R7 (ADV-3): source URL is the Solar System page, unrelated to both items. close → VOID / NONE. Archive by the forger → REVEALED, VOID_ARCHIVED.
- R8 (ADV-6 + ADV-9): source URL is a non-existent Wikipedia page (404 + full body, no exception); backup URL is `https://example.invalid/fakehall-backup` (DNS failure). `close_and_judge` must FAIL CLOSED: revert `SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED`, round stays VOTING, no verdict written. Then `resolve_unreachable_round` (by D1) → VOID / NONE / JUDGED, all 0. Then archive by the forger → REVEALED, VOID_ARCHIVED.
- R9: create → `cancel_open_round` by the forger with 0 votes → CANCELLED, no verdict, no scores.

## Expected leaderboards (after the full flow)

Detectives (non-VOID judged rounds only; VOID rounds excluded from
denominators): D1 voted in R1, R3, R4, R5, R6, R7, R8. The non-VOID
judged rounds are R1, R4, R5 — D1 was correct in all three → 300
points, 3 correct / 3 valid, accuracy_bps 10000. D2 voted in the same
rounds, correct in none → 0 points, 0 correct / 3 valid,
accuracy_bps 0. R2 contributes nothing (never judged); R3/R6/R7/R8
are VOID and excluded.
Forger: revealed-via-reveal rounds R1, R3, R4, R5 → 300 points total
(R1 100 + R3 0 + R4 100 + R5 100); total_challenged 8, total_fooled 3
→ deception_rate_bps 3750; revealed_rounds_count 4. (VOID-archived
rounds R6/R7/R8 are excluded from the forger denominators: they are
forfeits, not reveals.)

Revealed gallery: R1, R4, R5 only (REVEALED + verdict ≠ VOID). R3, R6,
R7, R8 are REVEALED but VOID and must NOT appear in the gallery.

## Adversarial cases (ADV-1..ADV-10)

| ADV | Case | Where | Expected on-chain result |
|---|---|---|---|
| ADV-1 | Both-fake → VOID | R3 | close → VOID / NONE, all 0 |
| ADV-2 | Clone gate + both-true → VOID | clone-gate ERROR tx; R6 | create with identical A/B reverts `ITEMS_IDENTICAL_NO_LLM_NEEDED`; R6 close → VOID |
| ADV-3 | Irrelevant source → VOID | R7 | close → VOID / NONE, all 0 |
| ADV-4 | Commitment swap / wrong salt → revert | R5 | wrong-salt reveal reverts `COMMITMENT_HASH_MISMATCH`, round stays JUDGED |
| ADV-5 | Forger self-vote → revert | R2 | `submit_investigation` by F reverts `FORGER_CANNOT_VOTE_OWN_ROUND` |
| ADV-6 | Dead link → fail-closed revert, stays VOTING | R8 | close reverts `SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED`, round stays VOTING |
| ADV-7 | Duplicate vote → revert | R2 | second vote by D1 reverts `DETECTIVE_ALREADY_VOTED` |
| ADV-8 | Lost-salt archive exit (detective archives) | R6 | archive by D1 → REVEALED, VOID_ARCHIVED, forger 0; supplement verifies, scores stay 0 |
| ADV-9 | `resolve_unreachable_round` → VOID via consensus | R8 | resolve → VOID / NONE / JUDGED, all 0 |
| ADV-10 | Replay: second reveal / second archive after REVEALED → revert | R1 | both revert `ROUND_ALREADY_FINALIZED` |

## Transaction plan (49 total: 1 deploy + 48 evidence txs)

- Deploy: 1.
- R1: create, vote D1, vote D2, close, reveal = 5.
- R2: create, vote D1, vote D2 = 3 (stays VOTING).
- R3: create, vote D1, vote D2, close, reveal = 5.
- R4: create, vote D1, vote D2, close, reveal = 5.
- R5: create, vote D1, vote D2, close, wrong-salt reveal (ERROR), correct reveal = 6.
- R6: create, vote D1, vote D2, close, archive (D1), supplement = 6.
- R7: create, vote D1, vote D2, close, archive = 5.
- R8: create, vote D1, vote D2, close (ERROR), resolve, archive = 6.
- R9: create, cancel = 2.
- Negatives: self-vote ERROR (R2), duplicate-vote ERROR (R2), clone-gate create ERROR, replay-reveal ERROR (R1), replay-archive ERROR (R1) = 5.
- Total evidence txs: 5+3+5+5+6+6+5+6+2+5 = 48; plus 1 deploy = 49.
  (CANONICAL.md calls this "the 48-tx plan" — that count is the 48
  evidence transactions excluding the deploy.)

Every core tx must be FINALIZED and read back via `get_*` pinned to
`latest-final`. If a consensus call returns an unexpected verdict
(especially R7 irrelevant-source VOID or R6 both-true VOID), retry once
and, if it still disagrees, record it as a FAILED item with the actual
verdict and stop that round's chain — never fudge it.

## What this evidence does NOT prove

- It does not prove the public source pages themselves are
  archaeologically true — only that the items do or do not contradict
  the stated source as fetched by the validators.
- It does not prove votes were secret from every observer: `get_*`
  reads mask votes until JUDGED, but raw transaction calldata is
  visible to anyone reading the chain directly.
- It does not prove the forger's salt is secret: the hash hides the
  choice, but if the forger loses the salt, `reveal_forgery` cannot be
  called (the archive exit exists for exactly that case).
