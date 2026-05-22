import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from '@/assets/manifest-types';

const manifestPath = join(process.cwd(), 'public', 'assets', 'manifest.json');

describe('generated asset manifest', () => {
  it('exists (run `pnpm assets:ingest` first)', () => {
    expect(existsSync(manifestPath)).toBe(true);
  });

  it('every entry points at a file that exists on disk', () => {
    const manifest: AssetManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    for (const entry of Object.values(manifest.entries)) {
      const abs = join(process.cwd(), 'public', entry.path);
      expect(existsSync(abs), `missing ingested file: ${entry.path}`).toBe(true);
    }
  });
});
