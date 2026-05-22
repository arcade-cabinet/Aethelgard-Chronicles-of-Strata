/** One curated asset: a source file in references/ mapped to a stable logical id. */
export interface AssetMapEntry {
  /** Stable logical id used throughout the codebase. */
  id: string;
  /** Source path relative to repo root, under references/. */
  source: string;
  /** Source pack name for the credits screen. */
  pack: string;
  /** License id. */
  license: 'CC0' | 'CC-BY';
}

/** Convert a logical id + kind into the output path under public/. */
export function logicalIdToOutputPath(id: string, kind: 'glb' | 'ogg' | 'wav'): string {
  return `assets/${id.split('.').join('/')}.${kind}`;
}

const HEX = 'references/Hexagon Kit/Models/GLB format';
const NATURE = 'references/Nature Kit/Models/GLTF format';

/**
 * The curation list. M0 ships the core board tiles needed by M1; later
 * milestones extend this array (one commit per milestone's asset additions).
 * Source paths are verified against references/ by the ingest script.
 */
export const ASSET_MAP: AssetMapEntry[] = [
  { id: 'board.tile.grass', source: `${HEX}/grass.glb`, pack: 'Hexagon Kit', license: 'CC0' },
  { id: 'board.tile.sand', source: `${HEX}/sand.glb`, pack: 'Hexagon Kit', license: 'CC0' },
  { id: 'board.tile.stone', source: `${HEX}/stone.glb`, pack: 'Hexagon Kit', license: 'CC0' },
  { id: 'board.tile.dirt', source: `${HEX}/dirt.glb`, pack: 'Hexagon Kit', license: 'CC0' },
  { id: 'board.tile.water', source: `${HEX}/water.glb`, pack: 'Hexagon Kit', license: 'CC0' },
  {
    id: 'board.tile.grass-forest',
    source: `${HEX}/grass-forest.glb`,
    pack: 'Hexagon Kit',
    license: 'CC0',
  },
  {
    id: 'board.tile.grass-hill',
    source: `${HEX}/grass-hill.glb`,
    pack: 'Hexagon Kit',
    license: 'CC0',
  },
  {
    id: 'board.tile.stone-mountain',
    source: `${HEX}/stone-mountain.glb`,
    pack: 'Hexagon Kit',
    license: 'CC0',
  },
  {
    id: 'board.tile.stone-hill',
    source: `${HEX}/stone-hill.glb`,
    pack: 'Hexagon Kit',
    license: 'CC0',
  },
  {
    id: 'board.tile.sand-desert',
    source: `${HEX}/sand-desert.glb`,
    pack: 'Hexagon Kit',
    license: 'CC0',
  },
  {
    id: 'nature.tree.pine-a',
    source: `${NATURE}/tree_pineDefaultA.glb`,
    pack: 'Nature Kit',
    license: 'CC0',
  },
  {
    id: 'nature.rock.large-a',
    source: `${NATURE}/rock_largeA.glb`,
    pack: 'Nature Kit',
    license: 'CC0',
  },
];
