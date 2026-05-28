import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AssetEntry } from '@/assets/manifest-types';

// The importable metadata lives in src/config/ (public/ import is forbidden by Vite).
const metadataPath = join(process.cwd(), 'src', 'config', 'assets', 'asset-metadata.json');

describe('asset-metadata.json', () => {
  it('exists (run `pnpm assets:ingest` first)', () => {
    expect(existsSync(metadataPath)).toBe(true);
  });

  it('every entry points at a file that exists on disk under public/', () => {
    const metadata: Record<string, AssetEntry> = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    for (const entry of Object.values(metadata)) {
      const abs = join(process.cwd(), 'public', entry.path);
      expect(existsSync(abs), `missing ingested file: ${entry.path}`).toBe(true);
    }
  });
});
