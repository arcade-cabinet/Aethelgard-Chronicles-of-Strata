/**
 * Structure-model accessor — a thin Skin-slot read.
 *
 * M_REGISTRY.3 — the per-(faction × type) mesh table moved to the Skin
 * registry (`src/rules/skins.ts`). The `StructureModel` type and the
 * full per-faction tables now live there as the single source of
 * truth. This module re-exports the type for back-compat and exposes
 * the legacy `structureModel(faction, type)` accessor that resolves
 * one mesh row via the Skin.
 *
 * Adding a third tribe is now ONE new SKINS entry; consumers that call
 * `structureModel` are unchanged.
 */
import type { BuildingType, Faction } from '@/ecs/components';
import { SKINS, type StructureModel } from '@/rules/skins';

export type { StructureModel };

/** Resolve the render model for a faction's structure type via the Skin slot. */
export function structureModel(faction: Faction, type: BuildingType): StructureModel {
  return SKINS[faction].structure[type];
}
