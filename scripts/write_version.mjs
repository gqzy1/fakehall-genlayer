// Writes dist/version.json with the sha256 of the built JS bundle so the
// served site can display its bundle version (cache-busting is by Vite's
// content-hashed asset filenames; this file is the human-readable record).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const assets = path.join(dist, 'assets');
const js = fs.readdirSync(assets).filter((f) => f.endsWith('.js')).sort();
const sha = createHash('sha256');
for (const f of js) sha.update(fs.readFileSync(path.join(assets, f)));
const out = {
  bundle_sha256: sha.digest('hex'),
  bundle_files: js,
  built_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify(out, null, 2));
console.log('version.json:', out.bundle_sha256.slice(0, 16), js.join(', '));
