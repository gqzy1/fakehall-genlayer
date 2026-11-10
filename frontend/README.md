# frontend/ — placeholder

The frontend is built by a separate step. It must use the canonical
method names in `contracts/fakehall.py` (`create_round`,
`submit_investigation`, `close_and_judge`, `reveal_forgery`,
`cancel_open_round`, `archive_judged_round`,
`resolve_unreachable_round`, `supplement_forger_reveal`, `get_round`,
`get_all_rounds`, `get_leaderboards`, `get_revealed_gallery`), read
only from `latest-final`, and follow Gate 11 (see
`~/workspace/build-fakehall/CANONICAL.md`).
