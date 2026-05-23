/**
 * M_EXPANSION.O.148 — local release dry-run.
 *
 * Walks the same gates release.yml does in CI:
 *   1. typecheck + lint + test (verify)
 *   2. web build
 *   3. github-pages build
 *   4. cyclonedx-npm SBOM generation
 *
 * Skipped vs CI:
 *   - APK assemble (needs Java 21 + Android SDK; tracked by `pnpm cap:sync`)
 *   - Sigstore attestation (needs GitHub OIDC + the live keystore)
 *
 * Run with `pnpm release:dry-run`. Exits non-zero on any step's failure
 * so contributors can catch a release-breaking change locally before
 * pushing a tag.
 */
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';

const STEPS: Array<{ name: string; cmd: string }> = [
  { name: 'verify (check + lint + format + test)', cmd: 'pnpm verify' },
  { name: 'web build', cmd: 'pnpm build' },
  { name: 'github-pages build', cmd: 'pnpm build:pages' },
  {
    name: 'cyclonedx SBOM',
    cmd: 'pnpm dlx @cyclonedx/cyclonedx-npm@4.2.1 --output-format JSON --output-file sbom.cdx.json',
  },
];

let failed = 0;
for (const step of STEPS) {
  process.stdout.write(`\n▶ ${step.name}\n`);
  try {
    execSync(step.cmd, { stdio: 'inherit' });
    process.stdout.write(`✓ ${step.name}\n`);
  } catch {
    process.stderr.write(`✘ ${step.name} — FAILED\n`);
    failed += 1;
  }
}

// Cleanup: SBOM is regenerated in CI, drop the local copy.
if (existsSync('sbom.cdx.json')) {
  try {
    unlinkSync('sbom.cdx.json');
  } catch {
    /* ignore */
  }
}

if (failed > 0) {
  process.stderr.write(`\nRelease dry-run FAILED on ${failed} step(s).\n`);
  process.exit(1);
}
process.stdout.write('\nRelease dry-run PASSED — push a tag and let release.yml take it.\n');
