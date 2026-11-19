# FakeHall Milestone · Sealed detective ballots

**Review baseline candidate** · [FakeHall v1 source at 69ff64b](https://github.com/gqzy1/fakehall-genlayer/tree/69ff64bd1ef610173cbeafa09cb840706b609a78) and [the original Studionet contract](https://explorer-studio.genlayer.com/address/0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2). The repository tip before this work is pinned here. The GenLayer submission record remains the authority for the accepted revision.

**New deployment** · [Stable Studionet contract](https://explorer-studio.genlayer.com/address/0x0d99A88De2AD4151453297b02d17bCD3EaA09d50) · [deployment receipt](https://explorer-studio.genlayer.com/tx/0x516fa70c0af3027c83645dc73c37c58afbd8e932c5bb2646c6a9b844212e2475) · [version diff](https://github.com/gqzy1/fakehall-genlayer/compare/69ff64bd1ef610173cbeafa09cb840706b609a78...milestone/sealed-detective-votes)
**Live demo** · [FakeHall Sealed Ballots](https://gqzy1.github.io/fakehall-genlayer/milestone/)

## What changed

The original game recorded the detective’s selection in public transaction arguments and masked it in queries. The new contract accepts only a salted hash during the commitment phase. It rejects a second commitment from the same detective and refuses all new commitments once the reveal window opens.

The forger can open reveal once a detective has committed. At capacity, anyone can open it. The contract uses the transaction timestamp to set a five-minute reveal window. Only the same wallet that committed can reveal, and choice, flaw, note and salt must match the commitment. Each hash also binds the round and contract address. Reveals are public from that point onward.

Anyone can judge after all ballots have been revealed or the window expires. Unrevealed ballots earn no points and stay out of scoring denominators. If nobody reveals, the round is voided without a source fetch. For a valid revealed ballot, the original source-grounded consensus and point allocation apply. The site saves the reveal data in the voting browser and supports downloading and restoring it with the original signer.

This is a new deployment with its own round IDs and leaderboards. The original contract and its historical results remain available. The revised protocol hides ballot contents during commitment. Wallet addresses, ballot counts, commitments and revealed ballot contents are public. An underfilled round still requires its forger to open reveal.

## Stable Studionet acceptance

| Case | Finalized transactions | Observed result |
| --- | --- | --- |
| Two sealed commitments | [commit one](https://explorer-studio.genlayer.com/tx/0xcf288b58f52cc25d629cb345028b12b49807a3aa2407806571706e217d8b1443), [commit two](https://explorer-studio.genlayer.com/tx/0x5e9ba51a673e259c3486f8ad77345b997f2a0f2371d782c7b94841f02c2ade4d) | Both transactions contain only the round ID and a SHA-256 digest. The pre-reveal readback shows zero revealed ballots. |
| Early reveal and duplicate commitment | [early reveal](https://explorer-studio.genlayer.com/tx/0x6c40590ca74c8a854e45c9dee19454725b41f2b9d2312e8f91ede396a1a27005), [duplicate commit](https://explorer-studio.genlayer.com/tx/0x80f9b2f562f6c1f0638d7030eef5e1536be28365dc9dcf84a8087d494919c179) | Rejected with `REVEAL_PHASE_CLOSED` and `DETECTIVE_ALREADY_COMMITTED`. |
| Late commitment and modified ballot | [late commit](https://explorer-studio.genlayer.com/tx/0x481d0e97e1f9306815b3a5073fbb5db228ae015b59eaf5acf84da0ba93b73b66), [modified ballot](https://explorer-studio.genlayer.com/tx/0xa999940eb2593009b259f8002b336f90041bf643a1d7a7939911e025cabe0cae) | Rejected with `COMMIT_PHASE_CLOSED` and `BALLOT_COMMITMENT_MISMATCH`. |
| Valid reveal and early judgment | [reveal one](https://explorer-studio.genlayer.com/tx/0xca6cfd27890ad507b50b1f2d836fda287038c7ccbe0e13cedb6c437abfe15f7c), [early judgment](https://explorer-studio.genlayer.com/tx/0x080332ad78b872a00e604b43e0d04433aa9fbd76fba824146514daf2db3bce54) | The original ballot was accepted. Judgment reverted with `BALLOT_REVEAL_IN_PROGRESS` while a second ballot was pending. |
| Settlement after expiry | [settle](https://explorer-studio.genlayer.com/tx/0x7f14ae55d19a0926ba20d7e357a103baae90622421b39c473761d55715ca1f5a), [archive](https://explorer-studio.genlayer.com/tx/0x03f20f24f2c42c239297f1d787496837397391e4dab1a2b83123d53155c043d6) | The round reached FAKE_B. The one valid revealed ballot earned 100 points. The unrevealed ballot earned zero and was excluded from scoring. |

Test transactions used three dedicated Studionet test signers. The run demonstrates protocol behavior on-chain.

## Reproduce

Run `npm ci`, `npm test` and `npm run build` from the repository root. Run `npm run verify:milestone` for a read-only Studionet check of deployed byte parity, finalized receipts, decoded commitment arguments and the latest finalized round.

- [Deployment metadata and source digest](evidence/milestone-deployment.json)
- [Transaction hashes, expected rejections and readback snapshots](evidence/milestone-ballots.json)
- [Original version’s verification instructions](https://github.com/gqzy1/fakehall-genlayer/blob/69ff64bd1ef610173cbeafa09cb840706b609a78/README.md)

## Submission copy

FakeHall now implements sealed detective ballots on GenLayer. Previously, the detective’s selection was visible in transaction calldata before the round was judged. The new contract locks salted, round- and wallet-bound commitments before any reveal. It verifies each reveal deterministically and can settle after the deadline even if a detective does not return. The update includes a signer-bound browser backup and restore flow, a new Stable Studionet deployment, and a read-only verification script.
