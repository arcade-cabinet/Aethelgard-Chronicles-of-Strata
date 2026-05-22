/** One curated asset: a source file in references/ mapped to a stable logical id. */
export interface AssetMapEntry {
  /** Stable logical id used throughout the codebase. */
  id: string;
  /** Source path relative to repo root, under references/. */
  source: string;
  /** Source pack name for the credits screen. */
  pack: string;
  /** License id. */
  license: 'CC0' | 'CC-BY' | 'Royalty-Free';
}

/** Convert a logical id + kind into the output path under public/. */
export function logicalIdToOutputPath(id: string, kind: 'glb' | 'ogg' | 'wav'): string {
  return `assets/${id.split('.').join('/')}.${kind}`;
}

const HEX = 'references/Hexagon Kit/Models/GLB format';
const NATURE = 'references/Nature Kit/Models/GLTF format';
const CASTLE = 'references/Castle Kit/Models/GLB format';
const TOWN = 'references/Fantasy Town Kit/Models/GLB format';
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

  // --- M7: structures — Castle Kit + Fantasy Town Kit (CC0) ---
  // Town Hall: complete square castle tower — reads as a keep/stronghold at hex scale.
  {
    id: 'structures.town-hall',
    source: `${CASTLE}/tower-square.glb`,
    pack: 'Castle Kit',
    license: 'CC0',
  },
  // Farm: windmill — iconic rural landmark, prominent silhouette, reads clearly.
  {
    id: 'structures.farm',
    source: `${TOWN}/windmill.glb`,
    pack: 'Fantasy Town Kit',
    license: 'CC0',
  },
  // Barracks: fortified tower with slant roof — reads as a military outpost.
  {
    id: 'structures.barracks',
    source: `${CASTLE}/tower-slant-roof.glb`,
    pack: 'Castle Kit',
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

  // --- M6: audio — OGG sfx (PixelLoops Audio, Royalty-Free) ---
  {
    id: 'audio.sfx.footstep-grass',
    source: 'references/footsteps_sound_effects_pack/OGG/pl_footstep_grass_01.ogg',
    pack: 'PixelLoops Audio — Footsteps Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.footstep-stone',
    source: 'references/footsteps_sound_effects_pack/OGG/pl_footstep_stone_01.ogg',
    pack: 'PixelLoops Audio — Footsteps Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.chop',
    source: 'references/Impact_Hit_Sound_Effects_Pack/OGG/pl_impact_wood_01.ogg',
    pack: 'PixelLoops Audio — Impact Hit Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.mine',
    source: 'references/Impact_Hit_Sound_Effects_Pack/OGG/pl_impact_stone_01.ogg',
    pack: 'PixelLoops Audio — Impact Hit Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.hit',
    source: 'references/Impact_Hit_Sound_Effects_Pack/OGG/pl_impact_hit_01.ogg',
    pack: 'PixelLoops Audio — Impact Hit Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.deposit',
    source: 'references/Inventory_And_Item_Sound_Effects_Pack/OGG/pl_coin_pickup_01.ogg',
    pack: 'PixelLoops Audio — Inventory Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.select',
    source: 'references/Inventory_And_Item_Sound_Effects_Pack/OGG/pl_button_soft_01.ogg',
    pack: 'PixelLoops Audio — Inventory Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.sfx.build',
    source: 'references/Impact_Hit_Sound_Effects_Pack/OGG/pl_impact_wood_02.ogg',
    pack: 'PixelLoops Audio — Impact Hit Pack',
    license: 'Royalty-Free',
  },

  // --- M6: audio — WAV music (PixelLoops Audio, Royalty-Free) ---
  {
    id: 'audio.music.menu',
    source: 'references/PixelLoops_Main_Menu_Music_Pack_v1.0/WAV/main_menu_fantasy_01.wav',
    pack: 'PixelLoops Audio — Main Menu Music Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.music.gameplay',
    source: 'references/GameLoops_Vol5_FantasyRPG/WAV/GLV5_TownOfEldor.wav',
    pack: 'PixelLoops Audio — GameLoops Vol5 Fantasy RPG',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.music.ambient',
    source:
      'references/Fantasy_Tavern_Music_Pack_12_Loops_PixelLoops/WAV/pl_tavern_loop_12_ambient.wav',
    pack: 'PixelLoops Audio — Fantasy Tavern Music Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.stinger.victory',
    source:
      'references/Victory_Level_Complete_Music_Pack_24_Stingers_PixelLoops/WAV/pl_vlc_victory_04_triumph.wav',
    pack: 'PixelLoops Audio — Victory Level Complete Pack',
    license: 'Royalty-Free',
  },
  {
    id: 'audio.stinger.defeat',
    source: 'references/Impact_Hit_Sound_Effects_Pack/WAV/pl_impact_heavy_04.wav',
    pack: 'PixelLoops Audio — Impact Hit Pack',
    license: 'Royalty-Free',
  },
];
