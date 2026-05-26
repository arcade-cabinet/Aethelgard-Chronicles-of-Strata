/**
 * M_V11.PROCMESH.PRIMITIVES — tier-1 substrate barrel export.
 *
 * Each primitive is faction-agnostic: it accepts MATERIAL objects, not
 * COLOR strings. SKINS provides per-faction materials at the building
 * composer layer.
 *
 * See docs/specs/PRD-v0.11.md §8 PROCEDURAL-MESHES for the three-tier
 * architecture (primitives → buildings → skins).
 */
export { Banner } from './Banner';
export { Battlement, BattlementRow } from './Battlement';
export { Buttress } from './Buttress';
export { Chimney } from './Chimney';
export { Column } from './Column';
export { ConeRoof } from './ConeRoof';
export { Door } from './Door';
export { GoldTrim } from './GoldTrim';
export { Log } from './Log';
export { PitchedRoof } from './PitchedRoof';
export { Shield } from './Shield';
export { Spire } from './Spire';
export { StoneBrick } from './StoneBrick';
export { StonePlinth } from './StonePlinth';
export { WeaponRack } from './WeaponRack';
export { Window } from './Window';
export { WoodPost } from './WoodPost';

export type { PrimitiveFamily, PrimitiveMaterial } from './types';
export { DEFAULT_MATERIALS } from './types';
