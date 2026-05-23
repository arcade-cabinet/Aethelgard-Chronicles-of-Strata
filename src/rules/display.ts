/**
 * Building display metadata — type re-export + accessor.
 *
 * M_REGISTRY.5 — the `BUILDING_DISPLAY` table moved into
 * `BUILDING_PROFILES[type].display`. This file now publishes the legacy
 * `BuildingDisplay` type alias (some callers depend on it) and the
 * accessor that resolves a building type → display slot via the unified
 * registry. `trainableUnits` + `trainerFor` moved to `building-profiles`
 * for the same reason — they're derived from the registry, not a separate
 * table.
 */
import type { BuildingType, ResourceType } from '@/ecs/components';
import { HUD_THEME } from '@/hud/hud-theme';
import { BUILDING_PROFILES, type DisplaySlot } from './building-profiles';

/** Alias kept for back-compat with existing imports. */
export type BuildingDisplay = DisplaySlot;

/** Resolve the display metadata for a building type. */
export function displayFor(type: BuildingType): BuildingDisplay {
  return BUILDING_PROFILES[type].display;
}

/**
 * Per-resource display metadata (M_AUDIT2.ARCH.2). Collapses the 3
 * parallel resource-display tables — ResourceText.tsx COLOR,
 * ResourceBar.tsx SLOT_DISPLAY, and the implicit color naming in
 * HUD_THEME (wood/stone/coin/accent) — into ONE source. Adding a new
 * resource = ONE row here + ONE entry in RESOURCE_TYPES; both the
 * HUD bar and the world-deposit popups pick it up automatically.
 */
export interface ResourceDisplay {
  /** Player-facing label. */
  label: string;
  /** Render color (HUD bar text + world popup). */
  color: string;
  /** DOM id for the HUD bar value span (test selectors). */
  domId: string;
}

export const RESOURCE_DISPLAY: Record<ResourceType, ResourceDisplay> = {
  wood: { label: 'Wood', color: HUD_THEME.color.wood, domId: 'val-wood' },
  stone: { label: 'Stone', color: HUD_THEME.color.stone, domId: 'val-stone' },
  gold: { label: 'Gold', color: HUD_THEME.color.coin, domId: 'val-gold' },
  science: { label: 'Science', color: HUD_THEME.color.accent, domId: 'val-science' },
};

/** Resolve display metadata for a resource type. */
export function resourceDisplayFor(type: ResourceType): ResourceDisplay {
  return RESOURCE_DISPLAY[type];
}
