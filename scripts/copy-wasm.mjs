#!/usr/bin/env node
/**
 * M_SEC.31 — Copy sql.js's `sql-wasm.wasm` into `public/` (and
 * `public/assets/` for the runtime asset URL) so the dev server +
 * production build serve it alongside the bundle.
 *
 * Was previously a 5-line inline `-e` script in package.json's
 * `copywasm` field — moved out so:
 *   - it's parseable by any reviewer without unescaping JSON
 *   - dependabot / supply-chain auditing can see the require() shape
 *   - future copy steps land here without growing package.json
 */
import { mkdirSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const src = require.resolve('sql.js/dist/sql-wasm.wasm');

for (const dir of [path.join('public'), path.join('public', 'assets')]) {
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, path.join(dir, 'sql-wasm.wasm'));
}
