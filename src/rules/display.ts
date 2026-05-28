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
import { RESOURCES } from '@/config/economy';
import { type BuildingType, RESOURCE_TYPES, type ResourceType } from '@/ecs/components';
import { HUD_THEME } from '@/hud/theme';
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

/**
 * QW-3 (coderabbit + simplifier reviewer) — RESOURCE_DISPLAY is now
 * DERIVED from `src/config/resources.json` (`label` + `color`) + a
 * mechanical `val-${id}` domId. Adding a 6th slot to resources.json
 * picks up its HUD pill automatically; the prior hand-listed Record
 * was a per-row touch.
 */
const FALLBACK_COLOR = HUD_THEME.color.stone;
export const RESOURCE_DISPLAY: Record<ResourceType, ResourceDisplay> = Object.fromEntries(
  RESOURCE_TYPES.map((id) => {
    const row = RESOURCES.find((r) => r.id === id);
    return [
      id,
      {
        label: row?.label ?? id,
        color: row?.color ?? FALLBACK_COLOR,
        domId: `val-${id}`,
      },
    ];
  }),
) as Record<ResourceType, ResourceDisplay>;

/** Resolve display metadata for a resource type. */
export function resourceDisplayFor(type: ResourceType): ResourceDisplay {
  return RESOURCE_DISPLAY[type];
}

/**
 * Health-bar color stops (M_AUDIT2.ARCH.16). Was a per-call
 * `barColor()` switch in HealthBillboard.tsx with literal thresholds
 * + colors. Lifted to a data table so a future "wound state" pass
 * (post-AOE flash, low-HP critical alarm) reads the same stops.
 *
 * Stops are ORDERED descending by `minFraction`; the first stop
 * whose `minFraction <= fraction` wins.
 */
export interface HealthBarStop {
  minFraction: number;
  color: string;
}

export const HEALTH_BAR_STOPS: ReadonlyArray<HealthBarStop> = [
  { minFraction: 0.5, color: '#10b981' }, // healthy green
  { minFraction: 0.25, color: '#eab308' }, // wounded yellow
  { minFraction: 0, color: '#ef4444' }, // critical red
];

/** Resolve the bar color for a health fraction. */
export function healthBarColor(fraction: number): string {
  for (const stop of HEALTH_BAR_STOPS) {
    if (fraction >= stop.minFraction) return stop.color;
  }
  return HEALTH_BAR_STOPS[HEALTH_BAR_STOPS.length - 1]?.color ?? '#ef4444';
}
