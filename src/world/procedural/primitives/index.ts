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
export { ArrowSlit } from './ArrowSlit';
export { Banner } from './Banner';
export { Battlement, BattlementRow } from './Battlement';
export { Buttress } from './Buttress';
export { Chimney } from './Chimney';
export { Column } from './Column';
export { ConeRoof } from './ConeRoof';
export { Door } from './Door';
export { Finial } from './Finial';
export { Flag } from './Flag';
export { Furrow } from './Furrow';
export { GoldTrim } from './GoldTrim';
export { HayStack } from './HayStack';
export { Ivy } from './Ivy';
export { Lantern } from './Lantern';
export { Log } from './Log';
export { PitchedRoof } from './PitchedRoof';
export { PlasterBox } from './PlasterBox';
export { Shield } from './Shield';
export { Silo } from './Silo';
export { Spire } from './Spire';
export { StoneBrick } from './StoneBrick';
export { StonePlinth } from './StonePlinth';
export { Tree } from './Tree';
export { WeaponRack } from './WeaponRack';
export { Window } from './Window';
export { WoodPost } from './WoodPost';

export type { PrimitiveFamily, PrimitiveMaterial } from './types';
export { DEFAULT_MATERIALS } from './types';
