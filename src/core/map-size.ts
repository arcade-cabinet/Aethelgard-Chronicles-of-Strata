import { WORLD } from '@/config/world';
import { getDeviceTier } from './device-tier';

/** A named map size and its hex radius. */
export interface MapSizeOption {
  /** Display label. */
  label: string;
  /** Hex radius passed to `generateBoard`. */
  radius: number;
}

/** The selectable map sizes. "Huge" is device-gated (see `availableMapSizes`). */
export const MAP_SIZES = {
  small: { label: 'Small', radius: WORLD.mapSizes.small },
  medium: { label: 'Medium', radius: WORLD.mapSizes.medium },
  large: { label: 'Large', radius: WORLD.mapSizes.large },
  huge: { label: 'Huge', radius: WORLD.mapSizes.huge },
} as const satisfies Record<string, MapSizeOption>;

/** A map-size key. */
export type MapSizeKey = keyof typeof MAP_SIZES;

/** The default map size. */
export const DEFAULT_MAP_SIZE: MapSizeKey = 'medium';

/**
 * Resolve which map sizes the current device can offer.
 * "Huge" requires a `high` device tier (see device-tier.ts).
 * M_AUDIT2.SEC2.29 — the underlying device probe is confined to
 * src/core/device-tier.ts; we only consume the opaque tier.
 */
export async function availableMapSizes(): Promise<MapSizeKey[]> {
  const base: MapSizeKey[] = ['small', 'medium', 'large'];
  const tier = await getDeviceTier();
  return tier === 'high' ? [...base, 'huge'] : base;
}
