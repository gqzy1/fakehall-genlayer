# Reviewer guide

| Item | Current milestone deployment |
| --- | --- |
| Network | GenLayer Stable Studionet · chain ID 61999 |
| Contract | [`0x0d99A88De2AD4151453297b02d17bCD3EaA09d50`](https://explorer-studio.genlayer.com/address/0x0d99A88De2AD4151453297b02d17bCD3EaA09d50) |
| Deployment receipt | [`0x516fa70c…e2475`](https://explorer-studio.genlayer.com/tx/0x516fa70c0af3027c83645dc73c37c58afbd8e932c5bb2646c6a9b844212e2475) |
| Source | [`contracts/fakehall.py`](contracts/fakehall.py) |
| SHA-256 | `abe44e492af66685604280c56398a98de43f4d181afa837f602100dd82af69e3` |
| Live site | [FakeHall investigation archive](https://gqzy1.github.io/fakehall-genlayer/) |

## Reproduce the evidence

- Run `npm ci` and `npm run verify:milestone` to verify deployed source parity, finalized receipts, decoded commitment arguments, reveal timing and the final readback of case #1. [Case #1 evidence](evidence/milestone-ballots.json)
- Run `node scripts/expand_archive.mjs --verify` to recheck the six additional demo cases and their finalized receipts. Case #3 remained ready for judgment after three failed attempts. [Showcase evidence](evidence/archive-showcase.json)
- Use the [Milestone comparison and acceptance table](MILESTONE.md) to trace changes from the pinned pre-Milestone GitHub revision.

The transactions were produced by test signers to exercise the protocol. The [current limitations](KNOWN_LIMITATIONS.md) describe ballot visibility, round progress and source verification.
