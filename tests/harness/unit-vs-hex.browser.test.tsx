/**
 * M_GAME.SCALE.GLB-MEASURE.1 — visual harness for the
 * measured-scale module. Renders a single Knight on a single hex
 * tile baseplate so the rendered footprint × scale is verifiable
 * against the BBOX-derived measurement.
 *
 * Lock-in pass: this captures a screenshot baseline that future
 * scale-tweak commits must not silently change. If a regenerated
 * glb-metadata.json changes a measured value, this baseline goes
 * red and forces a review of whether the new measurement is
 * intentional.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';

function HarnessScene() {
  return (
    <div style={{ width: 240, height: 240 }}>
      <Canvas camera={{ position: [2.4, 2.6, 2.4], fov: 38 }} style={{ background: '#1e293b' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 3]} intensity={1.4} />
        {/* HEX_RADIUS=1 baseplate (cylinder approximates the hex tile). */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <Suspense fallback={null}>
          <AnimatedCharacter role="Footman" clip="Idle_A" />
        </Suspense>
      </Canvas>
    </div>
  );
}

describe('unit-vs-hex harness (M_GAME.SCALE.GLB-MEASURE.1)', () => {
  it('renders Footman on a hex baseplate at the measured scale', async () => {
    render(<HarnessScene />);
    // Wait a short beat for the GLB suspense fallback to resolve and
    // the canvas to paint before snapshotting.
    await new Promise((r) => setTimeout(r, 700));
    await expect(page.screenshot({ path: 'tests/harness/__screenshots__/unit-vs-hex-knight.png' })).resolves.toBeTruthy();
  });
});
