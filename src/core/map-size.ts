import { Device } from '@capacitor/device';
import worldConfigRaw from '@/config/world.json';

interface WorldConfig {
  mapSizes: { small: number; medium: number; large: number; huge: number };
}

const worldConfig = worldConfigRaw as WorldConfig;

/** A named map size and its hex radius. */
export interface MapSizeOption {
  /** Display label. */
  label: string;
  /** Hex radius passed to `generateBoard`. */
  radius: number;
}

/** The selectable map sizes. "Huge" is device-gated (see `availableMapSizes`). */
export const MAP_SIZES = {
  small: { label: 'Small', radius: worldConfig.mapSizes.small },
  medium: { label: 'Medium', radius: worldConfig.mapSizes.medium },
  large: { label: 'Large', radius: worldConfig.mapSizes.large },
  huge: { label: 'Huge', radius: worldConfig.mapSizes.huge },
} as const satisfies Record<string, MapSizeOption>;

/** A map-size key. */
export type MapSizeKey = keyof typeof MAP_SIZES;

/** The default map size. */
export const DEFAULT_MAP_SIZE: MapSizeKey = 'medium';

/**
 * Resolve which map sizes the current device can offer. "Huge" (a 36-radius
 * board, ≈ 4000 tiles) is offered on web/desktop unconditionally and on native
 * devices running a sufficiently recent OS — older mobile OS versions are
 * excluded because the GPU/memory headroom for that tile count is unreliable.
 * Any query failure falls back to excluding Huge.
 */
export async function availableMapSizes(): Promise<MapSizeKey[]> {
  const base: MapSizeKey[] = ['small', 'medium', 'large'];
  try {
    const info = await Device.getInfo();
    if (info.platform === 'web') return [...base, 'huge'];
    // native: require a reasonably modern OS for the largest board
    const major = Number.parseInt(info.osVersion.split('.')[0] ?? '0', 10);
    const recentEnough =
      (info.platform === 'android' && major >= 12) || (info.platform === 'ios' && major >= 15);
    return recentEnough ? [...base, 'huge'] : base;
  } catch {
    return base;
  }
}
