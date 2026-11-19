# FakeHall 真假馆

FakeHall is a multiplayer forgery investigation game. Compare two records about a museum object, commit a sealed ballot, and reveal it before GenLayer validators judge the case against public sources. Scores are in-game points.

- [Official investigation archive](https://gqzy1.github.io/fakehall-genlayer/)
- [Current Stable Studionet contract · chain ID 61999](https://explorer-studio.genlayer.com/address/0x0d99A88De2AD4151453297b02d17bCD3EaA09d50)
- [Reviewer guide](REVIEWER.md) · [Milestone changes and acceptance evidence](MILESTONE.md)

## How an investigation works

1. The forger creates a case with two exhibit records and public source links.
2. Each detective commits a salted hash of their ballot. The forger can open reveal once a ballot is committed. At capacity, anyone can open reveal.
3. The original signer reveals within five minutes. The contract checks the choice, flaw, note and salt against the commitment, which is bound to the wallet, case and deployment.
4. Anyone can trigger judgment once all ballots are revealed or the deadline passes. Unrevealed ballots earn no points. With zero reveals, the contract records a void without fetching sources.

The archive includes shareable case links, exhibit comparison, ballot backup and recovery, and downloadable dossiers. Seven labeled on-chain demos cover open intake, sealed voting, pending judgment and all three outcomes.

| Example | Observed result |
| --- | --- |
| [#1 Rosetta Stone](https://gqzy1.github.io/fakehall-genlayer/?case=1) | FAKE_B · one valid ballot scored 100 and one ballot was unrevealed |
| [#2 Sutton Hoo Helmet](https://gqzy1.github.io/fakehall-genlayer/?case=2) | FAKE_A · one valid ballot scored 100 |
| [#4 Tutankhamun’s Mask](https://gqzy1.github.io/fakehall-genlayer/?case=4) | VOID · no points |

## Build and verify

```sh
npm ci
npm test
npm run build
npm run verify:milestone
node scripts/expand_archive.mjs --verify
```

The last two commands read Stable Studionet and require no wallet. See the [reviewer guide](REVIEWER.md) for deployment metadata, scope and evidence.

## Historical version

The original deployment and its nine-case dataset are documented at the [pre-Milestone revision](https://github.com/gqzy1/fakehall-genlayer/tree/69ff64bd1ef610173cbeafa09cb840706b609a78).
