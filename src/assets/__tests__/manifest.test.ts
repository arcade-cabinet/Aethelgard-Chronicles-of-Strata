import { describe, expect, it } from 'vitest';
import type { AssetManifest } from '../manifest-types';
import { createAssetAccessor } from '../manifest';

const fixture: AssetManifest = {
  generatedAt: '2026-05-22T00:00:00.000Z',
  entries: {
    'board.tile.grass': {
      id: 'board.tile.grass',
      path: 'assets/board/grass.glb',
      category: 'board',
      kind: 'glb',
      triangles: 120,
      animations: [],
      pack: 'Hexagon Kit',
      license: 'CC0',
    },
    'characters.heroes.knight': {
      id: 'characters.heroes.knight',
      path: 'assets/characters/heroes/knight.glb',
      category: 'characters',
      kind: 'glb',
      triangles: 956,
      animations: ['Idle', 'Walking', 'Attack'],
      pack: 'KayKit Adventurers',
      license: 'CC-BY',
    },
  },
};

describe('createAssetAccessor', () => {
  it('resolves an asset url by logical id with the base prefix applied', () => {
    const assets = createAssetAccessor(fixture, '/Aethelgard-Chronicles-of-Strata/');
    expect(assets.url('board.tile.grass')).toBe(
      '/Aethelgard-Chronicles-of-Strata/assets/board/grass.glb',
    );
  });

  it('throws a descriptive error for an unknown id', () => {
    const assets = createAssetAccessor(fixture, '/');
    expect(() => assets.url('board.tile.nonexistent')).toThrow(
      /unknown asset id: board\.tile\.nonexistent/i,
    );
  });

  it('returns the full entry by id', () => {
    const assets = createAssetAccessor(fixture, '/');
    expect(assets.entry('characters.heroes.knight').animations).toEqual([
      'Idle',
      'Walking',
      'Attack',
    ]);
  });

  it('lists all ids in a category', () => {
    const assets = createAssetAccessor(fixture, '/');
    expect(assets.idsInCategory('characters')).toEqual(['characters.heroes.knight']);
  });

  it('collects unique licenses with their packs for the credits screen', () => {
    const assets = createAssetAccessor(fixture, '/');
    expect(assets.credits()).toEqual([
      { pack: 'Hexagon Kit', license: 'CC0' },
      { pack: 'KayKit Adventurers', license: 'CC-BY' },
    ]);
  });
});
