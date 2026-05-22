// This file is auto-generated. Do not edit it manually.

export type StaticAssetPath =
  | 'assets/audio/music/ambient.wav'
  | 'assets/audio/music/gameplay.wav'
  | 'assets/audio/music/menu.wav'
  | 'assets/audio/sfx/build.ogg'
  | 'assets/audio/sfx/chop.ogg'
  | 'assets/audio/sfx/deposit.ogg'
  | 'assets/audio/sfx/footstep-grass.ogg'
  | 'assets/audio/sfx/footstep-stone.ogg'
  | 'assets/audio/sfx/hit.ogg'
  | 'assets/audio/sfx/mine.ogg'
  | 'assets/audio/sfx/select.ogg'
  | 'assets/audio/stinger/defeat.wav'
  | 'assets/audio/stinger/victory.wav'
  | 'assets/board/tile/dirt.glb'
  | 'assets/board/tile/grass-forest.glb'
  | 'assets/board/tile/grass-hill.glb'
  | 'assets/board/tile/grass.glb'
  | 'assets/board/tile/sand-desert.glb'
  | 'assets/board/tile/sand.glb'
  | 'assets/board/tile/stone-hill.glb'
  | 'assets/board/tile/stone-mountain.glb'
  | 'assets/board/tile/stone.glb'
  | 'assets/board/tile/water.glb'
  | 'assets/characters/enemies/orc.glb'
  | 'assets/characters/heroes/barbarian-large.glb'
  | 'assets/characters/heroes/barbarian.glb'
  | 'assets/characters/heroes/druid.glb'
  | 'assets/characters/heroes/engineer.glb'
  | 'assets/characters/heroes/knight.glb'
  | 'assets/characters/heroes/mage.glb'
  | 'assets/characters/heroes/ranger.glb'
  | 'assets/characters/heroes/rogue.glb'
  | 'assets/characters/rigs/large-general.glb'
  | 'assets/characters/rigs/large-movement.glb'
  | 'assets/characters/rigs/medium-general.glb'
  | 'assets/characters/rigs/medium-movement.glb'
  | 'assets/nature/rock/large-a.glb'
  | 'assets/nature/tree/pine-a.glb'
  | 'assets/structures/barracks.glb'
  | 'assets/structures/farm.glb'
  | 'assets/structures/town-hall.glb';

/**
 * Represents the known directories containing static assets.
 * '.' represents the root directory.
 */
export type StaticAssetDirectory =
  | 'assets/'
  | 'assets/audio/'
  | 'assets/audio/music/'
  | 'assets/audio/sfx/'
  | 'assets/audio/stinger/'
  | 'assets/board/'
  | 'assets/board/tile/'
  | 'assets/characters/'
  | 'assets/characters/enemies/'
  | 'assets/characters/heroes/'
  | 'assets/characters/rigs/'
  | 'assets/nature/'
  | 'assets/nature/rock/'
  | 'assets/nature/tree/'
  | 'assets/structures/';

/**
 * Represents the relative paths of files located *directly* within a specific directory.
 * Use '.' for the root directory.
 * @template Dir - A directory path string literal type from StaticAssetDirectory (e.g., 'icons/', 'icons/sun/', '.').
 */
export type FilesInFolder<Dir extends '.' | StaticAssetDirectory> = Dir extends '.'
  ? Exclude<StaticAssetPath, `${string}/${string}`>
  : Extract<StaticAssetPath, `${Dir}${string}`> extends infer Match
    ? Match extends `${Dir}${infer FileName}`
      ? FileName extends `${string}/${string}`
        ? never
        : Match
      : never
    : never;

const assets = new Set<string>([
  'assets/audio/music/ambient.wav',
  'assets/audio/music/gameplay.wav',
  'assets/audio/music/menu.wav',
  'assets/audio/sfx/build.ogg',
  'assets/audio/sfx/chop.ogg',
  'assets/audio/sfx/deposit.ogg',
  'assets/audio/sfx/footstep-grass.ogg',
  'assets/audio/sfx/footstep-stone.ogg',
  'assets/audio/sfx/hit.ogg',
  'assets/audio/sfx/mine.ogg',
  'assets/audio/sfx/select.ogg',
  'assets/audio/stinger/defeat.wav',
  'assets/audio/stinger/victory.wav',
  'assets/board/tile/dirt.glb',
  'assets/board/tile/grass-forest.glb',
  'assets/board/tile/grass-hill.glb',
  'assets/board/tile/grass.glb',
  'assets/board/tile/sand-desert.glb',
  'assets/board/tile/sand.glb',
  'assets/board/tile/stone-hill.glb',
  'assets/board/tile/stone-mountain.glb',
  'assets/board/tile/stone.glb',
  'assets/board/tile/water.glb',
  'assets/characters/enemies/orc.glb',
  'assets/characters/heroes/barbarian-large.glb',
  'assets/characters/heroes/barbarian.glb',
  'assets/characters/heroes/druid.glb',
  'assets/characters/heroes/engineer.glb',
  'assets/characters/heroes/knight.glb',
  'assets/characters/heroes/mage.glb',
  'assets/characters/heroes/ranger.glb',
  'assets/characters/heroes/rogue.glb',
  'assets/characters/rigs/large-general.glb',
  'assets/characters/rigs/large-movement.glb',
  'assets/characters/rigs/medium-general.glb',
  'assets/characters/rigs/medium-movement.glb',
  'assets/nature/rock/large-a.glb',
  'assets/nature/tree/pine-a.glb',
  'assets/structures/barracks.glb',
  'assets/structures/farm.glb',
  'assets/structures/town-hall.glb',
]);

// Store basePath resolved from Vite config
const BASE_PATH = '/';

/**
 * Gets the URL for a specific static asset
 * @param path Path to the asset
 * @returns The URL for the asset
 */
export function staticAssets(path: StaticAssetPath): string {
  if (!assets.has(path)) {
    throw new Error('Static asset does not exist in static assets directory');
  }
  return `${BASE_PATH}${path}`;
}
