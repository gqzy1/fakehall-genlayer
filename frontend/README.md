# frontend/ — pointer

The FakeHall frontend lives at the **repo root** (following the
ForkSeal pattern in `gqzy1/forkseal-genlayer`): `index.html`, `src/`
(`main.js`, `chain.js`, `i18n.js`, `style.css`, `seeds.js`,
`evidence.js`), `public/deployment.json`, `vite.config.js`, and
`.github/workflows/pages.yml` (GitHub Pages).

Build: `npm run build` → `dist/` (content-hashed assets) →
`node scripts/write_version.mjs` writes `dist/version.json`.

Rules the code follows (see `~/workspace/build-fakehall/CANONICAL.md`):
canonical method names (`create_round`, `submit_investigation`,
`close_and_judge`, `reveal_forgery`, `cancel_open_round`,
`archive_judged_round`, `resolve_unreachable_round`,
`supplement_forger_reveal`, `get_round`, `get_all_rounds`,
`get_leaderboards`, `get_revealed_gallery`); all reads pinned to
`"latest-final"`; the export gate's `is_finalized_readback` flag is set
only inside the readback functions in `src/chain.js`, never by a caller.
