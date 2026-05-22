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
const KAYKIT_ADV = 'references/KayKit_Adventurers_2.0_EXTRA';
const ADV_CHARS = `${KAYKIT_ADV}/Characters/gltf`;
const ADV_RIGS = `${KAYKIT_ADV}/Animations/gltf`;
const ORC_RAIDER = 'references/KayKit_Mystery_Monthly_Series_4/1 - July 2023 - Orc Raider';

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

  // --- M2: KayKit Adventurer heroes (Rig_Medium, CC-BY) ---
  {
    id: 'characters.heroes.knight',
    source: `${ADV_CHARS}/Knight.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.mage',
    source: `${ADV_CHARS}/Mage.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.barbarian',
    source: `${ADV_CHARS}/Barbarian.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.rogue',
    source: `${ADV_CHARS}/Rogue.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.ranger',
    source: `${ADV_CHARS}/Ranger.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.druid',
    source: `${ADV_CHARS}/Druid.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.engineer',
    source: `${ADV_CHARS}/Engineer.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.heroes.barbarian-large',
    source: `${ADV_CHARS}/Barbarian_Large.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },

  // --- M2: shared animation rig libraries (CC-BY) ---
  {
    id: 'characters.rigs.medium-movement',
    source: `${ADV_RIGS}/Rig_Medium/Rig_Medium_MovementBasic.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.rigs.medium-general',
    source: `${ADV_RIGS}/Rig_Medium/Rig_Medium_General.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.rigs.large-movement',
    source: `${ADV_RIGS}/Rig_Large/Rig_Large_MovementBasic.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },
  {
    id: 'characters.rigs.large-general',
    source: `${ADV_RIGS}/Rig_Large/Rig_Large_General.glb`,
    pack: 'KayKit Adventurers',
    license: 'CC-BY',
  },

  // --- M2: enemy character (Rig_Large, CC-BY) ---
  {
    id: 'characters.enemies.orc',
    source: `${ORC_RAIDER}/character/OrcRaider.glb`,
    pack: 'KayKit Mystery Series',
    license: 'CC-BY',
  },
];
