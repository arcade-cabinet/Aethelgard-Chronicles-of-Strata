import { Billboard, Text } from '@react-three/drei';
import { WORLD_TEXT_FONT } from '@/world/world-text-font';

/**
 * "Building" billboard tag (M_CONSTRUCTION.2) shown above a peon assigned
 * to BUILDING. A small text label that always faces the camera; gives the
 * player at-a-glance "this peon is hammering" feedback per the original
 * conversation spec.
 */
export function BuilderBadge() {
  return (
    <Billboard position={[0, 2.4, 0]}>
      <Text
        font={WORLD_TEXT_FONT}
        fontSize={0.32}
        color="#fbbf24"
        outlineWidth={0.04}
        outlineColor="#000"
        anchorX="center"
        anchorY="middle"
      >
        Building
      </Text>
    </Billboard>
  );
}
