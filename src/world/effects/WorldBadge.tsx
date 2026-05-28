/**
 * M_AUDIT2.ARCH.6 — shared world-space text billboard.
 *
 * CombatText, ResourceText, and any future floating-text emitter
 * (idle-peon "?", supply-cap nag) all want the same thing:
 * a drei Billboard at world XYZ rendering one Text node with the
 * project's outline + anchor defaults. Was ~10 LOC of boilerplate
 * per call site; lifted here so the spec lives once.
 *
 * Defaults match the prior CombatText/ResourceText conventions:
 * - black outline (0.04 width) for readability over any biome
 * - anchored to center/middle
 * - fillOpacity threaded through so fades work
 */
import { Billboard, Text } from '@react-three/drei';
import { WORLD_TEXT_FONT } from './world-text-font';

export interface WorldBadgeProps {
  /** World-space anchor. */
  x: number;
  y: number;
  z: number;
  /** Text to render. */
  text: string;
  /** Fill color (hex, named, etc). */
  color: string;
  /** Font size in world units (drei default ≈ 1). */
  fontSize?: number;
  /** Black outline width — make text legible over any biome. */
  outlineWidth?: number;
  /** Outline color (defaults to black). */
  outlineColor?: string;
  /** 0-1 fill opacity — let callers fade the popup. */
  fillOpacity?: number;
}

export function WorldBadge({
  x,
  y,
  z,
  text,
  color,
  fontSize = 0.42,
  outlineWidth = 0.04,
  outlineColor = '#000',
  fillOpacity = 1,
}: WorldBadgeProps) {
  return (
    <Billboard position={[x, y, z]}>
      <Text
        font={WORLD_TEXT_FONT}
        fontSize={fontSize}
        color={color}
        outlineWidth={outlineWidth}
        outlineColor={outlineColor}
        fillOpacity={fillOpacity}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </Billboard>
  );
}
