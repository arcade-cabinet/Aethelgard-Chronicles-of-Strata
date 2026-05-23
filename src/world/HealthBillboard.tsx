import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Mesh } from 'three';
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

/** Seconds for the bar to lerp the full 0→1 range. Damage of any size
 * settles within ~0.3s — quick enough to feel reactive, slow enough to
 * read as a fill animation (M_EXPANSION.S.54). */
const LERP_DURATION = 0.3;

/**
 * A camera-facing health bar floating above a unit (M_AUDIT2.UX.8,
 * M_EXPANSION.S.54). Three-layer stack:
 *  - dark frame for contrast against bright biomes
 *  - red "missing-health" inner bg so a half-dead unit reads as obviously
 *    half-dead even at a glance (the green fill alone reads as 'small')
 *  - colored fill (green→yellow→red via healthBarColor) tracking fraction
 *    — animated via useFrame so a chunk of damage lerps the bar down
 *    over LERP_DURATION instead of snapping.
 * Hidden at full health (a fresh unit shows no bar); fades in over the
 * 0.9→1.0 band so a unit nicked-then-healed doesn't pop the bar out.
 * Source: 70-rts-systems.md §Health billboard.
 */
export function HealthBillboard({ current, max, y = 2.1 }: HealthBillboardProps) {
  const fillRef = useRef<Mesh>(null);
  const displayedRef = useRef<number>(1);
  const [, rerender] = useState(0);

  useFrame((_, delta) => {
    if (max <= 0) return;
    const target = Math.max(0, Math.min(1, current / max));
    const cur = displayedRef.current;
    if (Math.abs(cur - target) < 0.001) return;
    // Lerp at a rate that takes LERP_DURATION to cover the full range.
    const step = (delta / LERP_DURATION) * Math.sign(target - cur);
    const next = Math.abs(target - cur) < Math.abs(step) ? target : cur + step;
    displayedRef.current = next;
    // Re-render — cheap, the mesh transforms are derived from displayedRef.
    rerender((n) => n + 1);
  });

  if (current <= 0 || max <= 0) return null;
  const displayed = displayedRef.current;
  // M_AUDIT2.UX.8 — fade band: 1.0 → fully transparent, 0.9 → fully
  // opaque. Lets a near-full unit show a faint bar before it
  // pops in. ≥1.0 still returns null (perfect health = no bar).
  if (displayed >= 1) return null;
  const opacity = displayed >= 0.9 ? Math.max(0, 1 - (displayed - 0.9) * 10) : 1;
  const width = 1;
  const FRAME_W = width + 0.06;
  const INNER_W = width;
  const INNER_H = 0.14;
  return (
    <Billboard position={[0, y, 0]}>
      {/* dark frame */}
      <mesh>
        <planeGeometry args={[FRAME_W, 0.2]} />
        <meshBasicMaterial color="#0b0f17" transparent opacity={opacity} />
      </mesh>
      {/* red missing-health inner background */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[INNER_W, INNER_H]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={opacity} />
      </mesh>
      {/* colored fill, anchored to the left edge */}
      <mesh ref={fillRef} position={[-(INNER_W * (1 - displayed)) / 2, 0, 0.01]}>
        <planeGeometry args={[INNER_W * displayed, INNER_H]} />
        <meshBasicMaterial color={healthBarColor(displayed)} transparent opacity={opacity} />
      </mesh>
    </Billboard>
  );
}
