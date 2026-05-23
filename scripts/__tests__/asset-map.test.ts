import { describe, expect, it } from 'vitest';
import { ASSET_MAP, logicalIdToOutputPath } from '../asset-map';

describe('asset map', () => {
  it('every entry has a unique logical id', () => {
    const ids = ASSET_MAP.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a source path under references/', () => {
    for (const e of ASSET_MAP) {
      expect(e.source.startsWith('references/')).toBe(true);
    }
  });

  it('derives an output path from a logical id and kind', () => {
    expect(logicalIdToOutputPath('board.tile.grass', 'glb')).toBe('assets/board/tile/grass.glb');
    expect(logicalIdToOutputPath('audio.sfx.footstep.grass', 'ogg')).toBe(
      'assets/audio/sfx/footstep/grass.ogg',
    );
  });

  it('includes the core board tiles for M1', () => {
    const ids = new Set(ASSET_MAP.map((e) => e.id));
    for (const required of [
      'board.tile.grass',
      'board.tile.sand',
      'board.tile.stone',
      'board.tile.water',
      'board.tile.dirt',
    ]) {
      expect(ids.has(required)).toBe(true);
    }
  });
});
