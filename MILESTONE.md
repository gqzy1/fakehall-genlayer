# FakeHall Milestone · Sealed detective ballots

**Review baseline candidate** · [FakeHall v1 source at 69ff64b](https://github.com/gqzy1/fakehall-genlayer/tree/69ff64bd1ef610173cbeafa09cb840706b609a78) and [the original Studionet contract](https://explorer-studio.genlayer.com/address/0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2). The repository tip before this work is pinned here. The GenLayer submission record remains the authority for the accepted revision.

**New deployment** · [Stable Studionet contract](https://explorer-studio.genlayer.com/address/0x0d99A88De2AD4151453297b02d17bCD3EaA09d50) · [deployment receipt](https://explorer-studio.genlayer.com/tx/0x516fa70c0af3027c83645dc73c37c58afbd8e932c5bb2646c6a9b844212e2475) · [version diff](https://github.com/gqzy1/fakehall-genlayer/compare/69ff64bd1ef610173cbeafa09cb840706b609a78...milestone/sealed-detective-votes)
**Live demo** · [FakeHall Sealed Ballots](https://gqzy1.github.io/fakehall-genlayer/milestone/)

## What changed

The original game recorded the detective’s selection in public transaction arguments and masked it in queries. The new contract accepts only a salted hash during the commitment phase. It rejects a second commitment from the same detective and refuses all new commitments once the reveal window opens.

The forger can open reveal once a detective has committed. At capacity, anyone can open it. The contract uses the transaction timestamp to set a five-minute reveal window. Only the same wallet that committed can reveal, and choice, flaw, note and salt must match the commitment. Each hash also binds the round and contract address. Reveals are public from that point onward.

Anyone can judge after all ballots have been revealed or the window expires. Unrevealed ballots earn no points and stay out of scoring denominators. If nobody reveals, the round is voided without a source fetch. For a valid revealed ballot, the original source-grounded consensus and point allocation apply. The site saves the reveal data in the voting browser and supports downloading and restoring it with the original signer.

This is a new deployment with its own round IDs and leaderboards. The original contract and its historical results remain available. The revised protocol hides ballot contents during commitment. Wallet addresses, ballot counts, commitments and revealed ballot contents are public. An underfilled round still requires its forger to open reveal.

## Reproduce

Run `npm ci`, `npm test` and `npm run build` from the repository root. Run `npm run verify:milestone` for a read-only Studionet check of deployed byte parity, finalized receipts, decoded commitment arguments and the latest finalized round.

- [Deployment metadata and source digest](evidence/milestone-deployment.json)
- [Transaction hashes, expected rejections and readback snapshots](evidence/milestone-ballots.json)
- [Original version’s verification instructions](https://github.com/gqzy1/fakehall-genlayer/blob/69ff64bd1ef610173cbeafa09cb840706b609a78/README.md)

## Submission copy

FakeHall now implements sealed detective ballots on GenLayer. Previously, the detective’s selection was visible in transaction calldata before the round was judged. The new contract locks salted, round- and wallet-bound commitments before any reveal. It verifies each reveal deterministically and can settle after the deadline even if a detective does not return. The update includes a signer-bound browser backup and restore flow, a new Stable Studionet deployment, and a read-only verification script.
