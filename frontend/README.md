# FakeHall frontend

The Vite application lives at the repository root. Entry points are `index.html` and `src/main.js`. Routing and archive helpers live in `src/archive.js`; Studionet reads and wallet handling live in `src/chain.js`.

- [Official site](https://gqzy1.github.io/fakehall-genlayer/)
- [Frontend deployment configuration](../public/deployment.json)
- [Current deployment and verification](../REVIEWER.md)

Run `npm ci`, then `npm run build`. The build writes `dist/`. Run `node scripts/write_version.mjs` to add the bundle fingerprint displayed in the footer. GitHub Pages serves the built files from the `gh-pages` branch. The previous `/milestone/` address redirects to the official site and preserves case parameters.

Case links use `?case=<id>`. English is the default, and a saved Chinese preference is respected. Case status and verdicts come from finalized reads on the configured deployment.
