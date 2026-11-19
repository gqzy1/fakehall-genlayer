# Current protocol limitations

- Commitments hide ballot contents until reveal. Wallet addresses, commitment hashes, counts and revealed ballots are public.
- Reveal can open once a detective commits. If the round is under capacity, the forger must open reveal. At capacity, anyone can open it.
- Preserve the original signer and ballot backup. An unrevealed ballot earns no points and stays out of scoring denominators.
- Validators judge the submitted records against fetched sources. Source availability and quote matching can cause judgment attempts to fail. Case #3 records three such unsuccessful attempts and remains available for judgment.
- The current deployment has its own case IDs and leaderboards. Earlier results are documented with the [original deployment](https://github.com/gqzy1/fakehall-genlayer/blob/69ff64bd1ef610173cbeafa09cb840706b609a78/KNOWN_LIMITATIONS.md).
