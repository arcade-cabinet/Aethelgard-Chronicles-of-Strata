import { Billboard } from '@react-three/drei';
import { healthBarColor } from '@/rules';

/** Props for a unit health billboard. */
export interface HealthBillboardProps {
  /** Current hit points. */
  current: number;
  /** Maximum hit points. */
  max: number;
  /** Height above the unit origin to float the bar. */
  y?: number;
}

// M_AUDIT2.ARCH.16 — bar color stops moved to rules/display.ts
// (HEALTH_BAR_STOPS). Call healthBarColor(fraction) to resolve.

/**
 * A camera-facing health bar floating above a unit. Hidden at full health (a
 * fresh unit shows no bar); the green/yellow/red fill tracks the health
 * fraction. Source: 70-rts-systems.md §Health billboard.
 */
export function HealthBillboard({ current, max, y = 2.1 }: HealthBillboardProps) {
  if (current >= max || current <= 0) return null;
  const fraction = Math.max(0, Math.min(1, current / max));
  const width = 1;
  return (
    <Billboard position={[0, y, 0]}>
      {/* dark background track */}
      <mesh>
        <planeGeometry args={[width + 0.06, 0.2]} />
        <meshBasicMaterial color="#0b0f17" />
      </mesh>
      {/* colored fill, anchored to the left edge */}
      <mesh position={[-(width * (1 - fraction)) / 2, 0, 0.01]}>
        <planeGeometry args={[width * fraction, 0.14]} />
        <meshBasicMaterial color={healthBarColor(fraction)} />
      </mesh>
    </Billboard>
  );
}
